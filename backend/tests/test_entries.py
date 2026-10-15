NEW_ENTRY = {"subsystem": "Sensors", "component": "Hall sensor", "failureMode": "No signal",
             "severity": 6, "occurrence": 3, "detection": 4, "dueDate": "2026-12-01"}


def test_create_entry(client, pm, demo_project):
    pid = demo_project["id"]
    r = client.post(f"/api/projects/{pid}/entries", json=NEW_ENTRY, headers=pm)
    assert r.status_code == 201, r.text
    e = r.json()
    assert e["failureMode"] == "No signal" and e["rpn"] == 72 and e["version"] == 1
    assert e["status"] == "Open" and e["revisedRPN"] == 5 * 3 * 3
    entries = client.get(f"/api/projects/{pid}", headers=pm).json()["entries"]
    assert entries[-1]["id"] == e["id"]  # appended in order


def test_create_entry_validates_ratings_and_status(client, pm, demo_project):
    pid = demo_project["id"]
    for bad in ({"severity": 11}, {"occurrence": 0}, {"status": "Done"}, {"dueDate": "31/12/2026"}):
        r = client.post(f"/api/projects/{pid}/entries", json={**NEW_ENTRY, **bad}, headers=pm)
        assert r.status_code == 422, bad


def test_reviewer_cannot_edit_entries(client, rv, demo_project):
    pid, eid = demo_project["id"], demo_project["entries"][0]["id"]
    assert client.post(f"/api/projects/{pid}/entries", json=NEW_ENTRY, headers=rv).status_code == 403
    assert client.patch(f"/api/entries/{eid}", json={"version": 1, "severity": 2}, headers=rv).status_code == 403
    assert client.delete(f"/api/entries/{eid}", headers=rv).status_code == 403


def test_update_records_history_and_bumps_version(client, pm, demo_project):
    e = demo_project["entries"][0]
    r = client.patch(f"/api/entries/{e['id']}", json={"version": 1, "severity": 9, "status": "Review"}, headers=pm)
    assert r.status_code == 200
    u = r.json()
    assert u["version"] == 2 and u["severity"] == 9 and u["status"] == "Review"
    [h] = u["history"]
    assert h["version"] == 1 and h["editedBy"]
    assert h["diff"] == {"severity": {"old": 7, "new": 9},
                         "rpn": {"old": e["rpn"], "new": 9 * e["occurrence"] * e["detection"]},
                         "status": {"old": "Open", "new": "Review"}}


def test_update_accepts_full_entry_object(client, pm, demo_project):
    # The React app sends the whole entry back; read-only keys must be ignored.
    e = demo_project["entries"][0]
    r = client.patch(f"/api/entries/{e['id']}", json={**e, "action": "New action"}, headers=pm)
    assert r.status_code == 200
    assert r.json()["action"] == "New action" and r.json()["version"] == 2
    assert list(r.json()["history"][0]["diff"]) == ["action"]


def test_update_without_changes_keeps_version(client, pm, demo_project):
    e = demo_project["entries"][0]
    r = client.patch(f"/api/entries/{e['id']}", json={"version": 1, "severity": e["severity"]}, headers=pm)
    assert r.json()["version"] == 1 and r.json()["history"] == []


def test_stale_version_conflicts(client, pm, demo_project):
    eid = demo_project["entries"][0]["id"]
    assert client.patch(f"/api/entries/{eid}", json={"version": 1, "severity": 8}, headers=pm).status_code == 200
    r = client.patch(f"/api/entries/{eid}", json={"version": 1, "severity": 2}, headers=pm)
    assert r.status_code == 409
    assert client.get(f"/api/projects/{demo_project['id']}", headers=pm).json()["entries"][0]["severity"] == 8


def test_delete_entry(client, pm, demo_project):
    eid = demo_project["entries"][0]["id"]
    assert client.delete(f"/api/entries/{eid}", headers=pm).status_code == 204
    entries = client.get(f"/api/projects/{demo_project['id']}", headers=pm).json()["entries"]
    assert eid not in [e["id"] for e in entries] and len(entries) == 4


def test_reviewer_comments_and_resolves(client, pm, rv, demo_project):
    eid = demo_project["entries"][0]["id"]
    sofia = client.get("/api/auth/me", headers=rv).json()
    r = client.post(f"/api/entries/{eid}/comments", json={"text": "  Is derating enough?  "}, headers=rv)
    assert r.status_code == 201
    c = r.json()
    assert c["text"] == "Is derating enough?" and c["status"] == "open" and c["authorId"] == sofia["id"]

    [s] = client.get("/api/projects", headers=pm).json()
    assert s["commentCount"] == 1 and s["openCommentCount"] == 1

    assert client.post(f"/api/comments/{c['id']}/resolve", headers=rv).status_code == 403
    r = client.post(f"/api/comments/{c['id']}/resolve", headers=pm)
    assert r.json()["status"] == "resolved" and r.json()["resolvedAt"].endswith("Z")
    [s] = client.get("/api/projects", headers=pm).json()
    assert s["openCommentCount"] == 0


def test_empty_comment_rejected(client, rv, demo_project):
    eid = demo_project["entries"][0]["id"]
    assert client.post(f"/api/entries/{eid}/comments", json={"text": ""}, headers=rv).status_code == 422
