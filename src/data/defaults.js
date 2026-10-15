export const DEFAULT_USERS=[
  {id:"u1",name:"Alex Ferreira",username:"alex",password:"pm123",role:"PM",color:"#00d4ff",active:true},
  {id:"u2",name:"Sofia Mendes",username:"sofia",password:"rv123",role:"RV",color:"#a855f7",active:true},
  {id:"u3",name:"Bruno Costa",username:"bruno",password:"rv456",role:"RV",color:"#22c55e",active:true},
];
export const DEMO_ENTRIES=[
  {id:"d1",subsystem:"Power Supply",component:"DC-DC Converter",function:"Regulate 24V→5V",failureMode:"Output voltage out of tolerance",failureEffect:"MCU reset / data corruption",failureCause:"Capacitor aging / thermal stress",category:"Component Drift",severity:7,occurrence:4,detection:3,rpn:84,controls:"100% EOL test, HALT testing",action:"Add TVS diode, increase derating",responsible:"HW-Lead",dueDate:"2025-06-30",status:"Open",revisedS:7,revisedO:2,revisedD:2,revisedRPN:28,version:1,history:[],comments:[]},
  {id:"d2",subsystem:"Motor Drive",component:"Gate Driver IC",function:"Drive IGBT switches",failureMode:"Gate drive undervoltage lockout",failureEffect:"Motor stops unexpectedly",failureCause:"EMI coupling on bootstrap supply",category:"EMI/EMC",severity:9,occurrence:3,detection:5,rpn:135,controls:"PCB EMI review, ferrite beads",action:"Redesign isolation barrier",responsible:"HW-Lead",dueDate:"2025-05-15",status:"Open",revisedS:9,revisedO:2,revisedD:2,revisedRPN:36,version:1,history:[],comments:[]},
  {id:"d3",subsystem:"Control Logic",component:"STM32 MCU",function:"Execute safety state machine",failureMode:"MCU lockup / unresponsive",failureEffect:"Safety function unavailable",failureCause:"Stack overflow / runaway pointer",category:"Firmware Fault",severity:9,occurrence:2,detection:4,rpn:72,controls:"Watchdog timer, SW review",action:"MISRA-C compliance, unit tests",responsible:"FW-Lead",dueDate:"2025-07-01",status:"Review",revisedS:9,revisedO:1,revisedD:2,revisedRPN:18,version:1,history:[],comments:[]},
  {id:"d4",subsystem:"I/O Interface",component:"Digital Input Module",function:"Read emergency stop signal",failureMode:"Input stuck HIGH",failureEffect:"E-stop not detected",failureCause:"ESD damage to input clamp",category:"ESD Damage",severity:10,occurrence:2,detection:3,rpn:60,controls:"TVS on inputs, IEC 61000-4-2",action:"Add redundant input channel",responsible:"HW-Lead",dueDate:"2025-05-30",status:"Open",revisedS:10,revisedO:1,revisedD:1,revisedRPN:10,version:1,history:[],comments:[]},
  {id:"d5",subsystem:"Communication",component:"CAN Bus Transceiver",function:"Industrial fieldbus comms",failureMode:"Bus dominant fault",failureEffect:"Network loss — all nodes offline",failureCause:"Short to GND on CAN_L line",category:"Short Circuit",severity:8,occurrence:3,detection:4,rpn:96,controls:"Termination resistors, TVS",action:"Add CAN fault confinement logic",responsible:"HW-Lead",dueDate:"2025-06-15",status:"Closed",revisedS:8,revisedO:2,revisedD:2,revisedRPN:32,version:1,history:[],comments:[]},
];
export const EMPTY_DIAGRAM={nodes:[],edges:[]};
export const DEMO_DIAGRAM={
  nodes:[
    {id:"n1",type:"input",  label:"24V DC Supply",subtitle:"External Power",x:60, y:180,w:130,h:60,color:"#1a3020",border:"#22c55e"},
    {id:"n2",type:"power",  label:"Power Supply",  subtitle:"PSU / DC-DC",  x:260,y:180,w:140,h:60,color:"#3a2f00",border:"#ffb020"},
    {id:"n3",type:"subsystem",label:"Control Logic",subtitle:"MCU / FPGA",  x:460,y:80, w:140,h:60,color:"#1e3a5f",border:"#00d4ff"},
    {id:"n4",type:"subsystem",label:"Motor Drive",  subtitle:"Gate+IGBT",   x:460,y:200,w:140,h:60,color:"#1e3a5f",border:"#00d4ff"},
    {id:"n5",type:"subsystem",label:"I/O Interface",subtitle:"DI/DO Module",x:460,y:320,w:140,h:60,color:"#1e3a5f",border:"#00d4ff"},
    {id:"n6",type:"subsystem",label:"Communication",subtitle:"CAN/Ethernet", x:460,y:440,w:140,h:60,color:"#1e3a5f",border:"#00d4ff"},
    {id:"n7",type:"output",  label:"AC Motor",     subtitle:"3-Phase Load", x:680,y:200,w:130,h:60,color:"#3a1f10",border:"#f97316"},
    {id:"n8",type:"external",label:"PLC / SCADA",  subtitle:"Host System",  x:680,y:440,w:130,h:60,color:"#2a1f3a",border:"#a855f7"},
    {id:"n9",type:"input",   label:"Safety E-Stop",subtitle:"Emergency Stop",x:260,y:320,w:130,h:60,color:"#1a3020",border:"#22c55e"},
  ],
  edges:[
    {id:"e1",from:"n1",to:"n2",label:"24V DC"},{id:"e2",from:"n2",to:"n3",label:"5V Logic"},
    {id:"e3",from:"n2",to:"n4",label:"15V Gate"},{id:"e4",from:"n2",to:"n5",label:"5V I/O"},
    {id:"e5",from:"n2",to:"n6",label:"3.3V"},{id:"e6",from:"n3",to:"n4",label:"PWM"},
    {id:"e7",from:"n4",to:"n7",label:"3Φ PWM"},{id:"e8",from:"n9",to:"n5",label:"E-Stop"},
    {id:"e9",from:"n5",to:"n3",label:"Digital I/O"},{id:"e10",from:"n6",to:"n8",label:"CAN Bus"},
    {id:"e11",from:"n3",to:"n6",label:"SPI/UART"},
  ]
};
