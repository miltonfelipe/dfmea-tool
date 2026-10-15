def test_projects_require_auth(client):
    assert client.get("/api/projects").status_code == 401


def test_create_empty_project(client, pm):
    r = client.post("/api/projects", json={"name": "Empty", "product": "Drive X"}, headers=pm)
    assert r.status_code == 201
    p = r.json()
    assert p["name"] == "Empty" and p["product"] == "Drive X" and p["revision"] == "A"
    assert p["entries"] == [] and p["diagram"] is None
    assert p["createdAt"].endswith("Z")


def test_demo_project_has_entries_and_diagram(demo_project):
    assert len(demo_project["entries"]) == 5
    assert len(demo_project["diagram"]["nodes"]) == 9
    e = demo_project["entries"][0]
    assert e["component"] == "DC-DC Converter"
    assert e["rpn"] == e["severity"] * e["occurrence"] * e["detection"] == 84
    assert e["revisedRPN"] == 28
    assert e["version"] == 1 and e["history"] == [] and e["comments"] == []


def test_reviewer_can_read_but_not_write(client, rv, demo_project):
    pid = demo_project["id"]
    assert client.get(f"/api/projects/{pid}", headers=rv).status_code == 200
    assert client.post("/api/projects", json={"name": "X"}, headers=rv).status_code == 403
    assert client.patch(f"/api/projects/{pid}", json={"name": "X"}, headers=rv).status_code == 403
    assert client.delete(f"/api/projects/{pid}", headers=rv).status_code == 403
    assert client.put(f"/api/projects/{pid}/diagram", json={"nodes": [], "edges": []}, headers=rv).status_code == 403


def test_list_summaries(client, pm, demo_project):
    [s] = client.get("/api/projects", headers=pm).json()
    assert s["id"] == demo_project["id"]
    assert s["entryCount"] == 5 and s["criticalCount"] == 0 and s["openCount"] == 3
    assert s["commentCount"] == 0 and s["openCommentCount"] == 0
    assert "entries" not in s


def test_update_settings_bumps_updated_at(client, pm, demo_project):
    pid = demo_project["id"]
    r = client.patch(f"/api/projects/{pid}", json={"name": "Renamed", "revision": "B"}, headers=pm)
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed" and r.json()["revision"] == "B"
    assert r.json()["updatedAt"] >= demo_project["updatedAt"]


def test_save_diagram(client, pm, demo_project):
    pid = demo_project["id"]
    d = {"nodes": [{"id": "a", "label": "Only", "x": 1, "y": 2}], "edges": []}
    assert client.put(f"/api/projects/{pid}/diagram", json=d, headers=pm).json() == d
    assert client.get(f"/api/projects/{pid}", headers=pm).json()["diagram"] == d


def test_delete_project_cascades(client, pm, demo_project):
    pid = demo_project["id"]
    eid = demo_project["entries"][0]["id"]
    client.post(f"/api/entries/{eid}/comments", json={"text": "hi"}, headers=pm)
    assert client.delete(f"/api/projects/{pid}", headers=pm).status_code == 204
    assert client.get(f"/api/projects/{pid}", headers=pm).status_code == 404
    assert client.post(f"/api/entries/{eid}/comments", json={"text": "x"}, headers=pm).status_code == 404


def test_export_import_roundtrip(client, pm, rv, demo_project):
    pid = demo_project["id"]
    eid = demo_project["entries"][0]["id"]
    client.patch(f"/api/entries/{eid}", json={"version": 1, "severity": 8}, headers=pm)
    client.post(f"/api/entries/{eid}/comments", json={"text": "Check derating"}, headers=rv)

    exported = client.get(f"/api/projects/{pid}/export", headers=pm).json()
    assert exported["__format"] == "DFMEA-v2"

    r = client.post("/api/projects/import", json=exported, headers=pm)
    assert r.status_code == 201, r.text
    imp = r.json()
    assert imp["id"] != pid and imp["name"] == demo_project["name"]
    assert imp["diagram"] == demo_project["diagram"]
    first = imp["entries"][0]
    assert first["id"] != eid
    assert first["severity"] == 8 and first["version"] == 2
    assert first["history"][0]["diff"]["severity"] == {"old": 7, "new": 8}
    assert first["comments"][0]["text"] == "Check derating"
    assert [e["component"] for e in imp["entries"]] == [e["component"] for e in demo_project["entries"]]


def test_import_accepts_frontend_export_shape(client, pm):
    # Shape produced by the current React app's "Export .dfmea" (extra keys ignored).
    payload = {"__format": "DFMEA-v2", "exportedAt": "2026-01-01T00:00:00.000Z", "project": {
        "id": "abc", "name": "From Browser", "revision": "C", "diagram": None,
        "entries": [{"id": "x1", "component": "Fuse", "severity": 6, "occurrence": 2, "detection": 3,
                     "rpn": 36, "revisedRPN": 18, "status": "Review", "dueDate": "2026-03-01",
                     "comments": [{"id": "c1", "authorId": "u2", "text": "ok?", "createdAt":
                                   "2026-01-02T10:00:00.000Z", "status": "open"}]}]}}
    r = client.post("/api/projects/import", json=payload, headers=pm)
    assert r.status_code == 201, r.text
    e = r.json()["entries"][0]
    assert e["component"] == "Fuse" and e["rpn"] == 36 and e["dueDate"] == "2026-03-01"
    assert e["comments"][0]["authorId"] == "u2"
    assert e["comments"][0]["createdAt"] == "2026-01-02T10:00:00.000Z"


def test_import_rejects_unknown_format(client, pm):
    r = client.post("/api/projects/import", json={"__format": "OTHER", "project": {"name": "x", "entries": []}},
                    headers=pm)
    assert r.status_code == 422
