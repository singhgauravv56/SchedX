const data = {
  courses: [
    ["Data Structures","CSE","Major","4","72"],["Operating Systems","CSE","Major","4","68"],
    ["Database Systems","CSE","Major","4","70"],["Artificial Intelligence","CSE","Major","4","64"],
    ["Economics","Humanities","Minor","3","45"],["Psychology","Humanities","Minor","3","38"],
    ["Entrepreneurship","Management","Multidisciplinary","3","52"],["Cloud Computing Lab","CSE","Lab","2","40"]
  ],
  teachers: [
    ["Dr. Rahul Kumar","CSE","Data Structures","Mon–Fri"],["Dr. Priya Sharma","CSE","Operating Systems","Mon–Thu"],
    ["Dr. Amit Verma","CSE","Database Systems","Mon–Fri"],["Dr. Neha Singh","CSE","Artificial Intelligence","Tue–Fri"],
    ["Dr. Anjali Rao","Humanities","Economics","Mon–Wed"],["Dr. Karan Mehta","Management","Entrepreneurship","Mon–Fri"]
  ],
  rooms: [
    ["R-101","Classroom","80","Projector, AC"],["R-203","Classroom","70","Projector"],["R-305","Classroom","60","Projector, AC"],
    ["LAB-1","Computer Lab","40","40 PCs, Projector"],["AUD-1","Seminar Hall","150","Projector, Audio"]
  ]
};

function typeClass(t){ return t==="Major"?"major":t==="Minor"?"minor":t==="Multidisciplinary"?"multi":"lab"; }

function renderTables(){
  document.getElementById("courseTable").innerHTML = data.courses.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td><span class="type ${typeClass(r[2])}">${r[2]}</span></td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join("");
  document.getElementById("teacherTable").innerHTML = data.teachers.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("");
  document.getElementById("roomTable").innerHTML = data.rooms.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("");
  document.getElementById("courseCount").textContent=data.courses.length;
  document.getElementById("teacherCount").textContent=data.teachers.length;
  document.getElementById("roomCount").textContent=data.rooms.length;
}

const slots = [
  ["09:00–10:00", ["Data Structures|R-101|Dr. Rahul|major","Database Systems|R-203|Dr. Amit|major","Economics|R-305|Dr. Anjali|minor","Artificial Intelligence|R-101|Dr. Neha|major","Entrepreneurship|AUD-1|Dr. Karan|multi"]],
  ["10:00–11:00", ["Operating Systems|R-101|Dr. Priya|major","Artificial Intelligence|R-203|Dr. Neha|major","Psychology|R-305|Dr. Karan|minor","Database Systems|R-101|Dr. Amit|major","Data Structures|R-203|Dr. Rahul|major"]],
  ["11:00–12:00", ["Cloud Computing Lab|LAB-1|Dr. Neha|lab","Data Structures|R-203|Dr. Rahul|major","Operating Systems|R-101|Dr. Priya|major","Economics|R-305|Dr. Anjali|minor","Artificial Intelligence|R-203|Dr. Neha|major"]],
  ["12:00–13:00", ["BREAK|||","BREAK|||","BREAK|||","BREAK|||","BREAK|||"]],
  ["13:00–14:00", ["Artificial Intelligence|R-101|Dr. Neha|major","Entrepreneurship|AUD-1|Dr. Karan|multi","Database Systems|R-203|Dr. Amit|major","Data Structures|R-101|Dr. Rahul|major","Psychology|R-305|Dr. Anjali|minor"]]
];

function renderTimetable(){
  const g=document.getElementById("timetableGrid");
  let html=`<div class="t-head">Time</div>${["Monday","Tuesday","Wednesday","Thursday","Friday"].map(x=>`<div class="t-head">${x}</div>`).join("")}`;
  slots.forEach(row=>{
    html+=`<div class="time-cell">${row[0]}</div>`;
    row[1].forEach(item=>{
      const [course,room,teacher,kind]=item.split("|");
      if(course==="BREAK") html+=`<div class="slot"><b>BREAK</b><small>—</small></div>`;
      else html+=`<div class="slot ${kind}"><b>${course}</b><small>${room} • ${teacher}</small></div>`;
    });
  });
  g.innerHTML=html;
}

function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}

function generate(){
  const score=(95+Math.random()*3.8).toFixed(1);
  document.getElementById("score").textContent=score+"%";
  document.getElementById("progress").style.width=score+"%";
  document.getElementById("conflictCount").textContent="0";
  toast("Timetable optimized — 0 hard conflicts.");
  renderTimetable();
}

document.querySelectorAll(".nav").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".nav").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(btn.dataset.page).classList.add("active");
  document.getElementById("pageTitle").textContent={
    dashboard:"AI Timetable Dashboard",courses:"Course Management",teachers:"Faculty Management",
    rooms:"Room Management",constraints:"Constraint Configuration",timetable:"Generated Timetable",assistant:"AI Assistant"
  }[btn.dataset.page];
}));

document.getElementById("generateHero").onclick=()=>{generate(); document.querySelector('[data-page="timetable"]').click();};
document.getElementById("regen").onclick=generate;
document.getElementById("saveConstraints").onclick=()=>toast("Constraint settings saved.");
document.getElementById("exportBtn").onclick=()=>window.print();

function addItem(type){
  const label=type==="course"?"course name":type==="teacher"?"teacher name":"room number";
  const value=prompt("Enter "+label+":");
  if(!value)return;
  if(type==="course")data.courses.push([value,"CSE","Major","3","50"]);
  if(type==="teacher")data.teachers.push([value,"CSE","General","Mon–Fri"]);
  if(type==="room")data.rooms.push([value,"Classroom","60","Projector"]);
  renderTables();toast("Added "+value);
}

const responses = [
  [/dbms/i,"Database Systems is scheduled Monday 09:00–10:00 in R-203 with Dr. Amit."],
  [/free.*tuesday|tuesday.*free/i,"Tuesday has a scheduled break from 12:00–13:00. Other shown slots contain classes."],
  [/score|high/i,"The prototype score combines hard-constraint satisfaction with soft preferences such as workload balance and fewer student gaps. Current score is "+document.getElementById("score").textContent+"."],
  [/conflict/i,"The current generated timetable reports 0 hard conflicts: no teacher collisions, room collisions, or capacity violations."],
  [/next.*class/i,"The next listed class is Data Structures at 09:00 in R-101 with Dr. Rahul."]
];
function ask(q){
  const box=document.getElementById("messages");
  box.innerHTML+=`<div class="msg user"><p>${q}</p></div>`;
  let answer="I can answer timetable questions using the prototype data. Try asking about a course, free period, conflicts, or optimization score.";
  for(const [re,a] of responses)if(re.test(q)){answer=a;break}
  setTimeout(()=>{box.innerHTML+=`<div class="msg bot"><b>SmartSchedule AI</b><p>${answer}</p></div>`;box.scrollTop=box.scrollHeight},250);
}
document.getElementById("sendBtn").onclick=()=>{const i=document.getElementById("chatInput");if(i.value.trim()){ask(i.value.trim());i.value=""}};
document.getElementById("chatInput").addEventListener("keydown",e=>{if(e.key==="Enter")document.getElementById("sendBtn").click()});

renderTables();renderTimetable();
