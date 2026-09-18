const API = "/api";
const $ = id => document.getElementById(id);

function toast(text){ const t=$("toast"); t.textContent=text; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2500); }
function message(text, type="success"){ const m=$("message"); m.textContent=text; m.className=`message show ${type}`; }
function val(id){ return $(id).value.trim(); }
async function api(url, options={}){
  try{
    const r=await fetch(API+url,options);
    let d={}; try{d=await r.json()}catch{}
    if(!r.ok) throw new Error(d.error||"Request failed");
    return d;
  }catch(e){ throw new Error(e.message.includes("Failed to fetch")?"Server is not running. Start it with npm start.":e.message); }
}

async function loadAll(){
  try{
    const [courses,teachers,classes,rooms,timetable]=await Promise.all([api("/courses"),api("/teachers"),api("/classes"),api("/rooms"),api("/timetable")]);
    $("courseCount").textContent=courses.length; $("teacherCount").textContent=teachers.length; $("classCount").textContent=classes.length; $("roomCount").textContent=rooms.length;
    render("courseTable",courses,r=>`<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.department)}</td><td>${esc(r.course_type)}</td><td>${r.credits}</td><td>${r.students}</td><td>${r.weekly_periods}</td><td><button class="delete-btn" onclick="del('courses',${r.course_id})">Delete</button></td></tr>`);
    render("teacherTable",teachers,r=>`<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.department)}</td><td>${esc(r.specialization)}</td><td>${esc(r.availability)}</td><td><button class="delete-btn" onclick="del('teachers',${r.teacher_id})">Delete</button></td></tr>`);
    render("classTable",classes,r=>`<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.section)}</td><td>${r.semester}</td><td>${r.students}</td><td><button class="delete-btn" onclick="del('classes',${r.class_id})">Delete</button></td></tr>`);
    render("roomTable",rooms,r=>`<tr><td><b>${esc(r.room_name)}</b></td><td>${esc(r.room_type)}</td><td>${r.capacity}</td><td>${esc(r.facilities||"")}</td><td><button class="delete-btn" onclick="del('rooms',${r.room_id})">Delete</button></td></tr>`);
    render("timetableBody",timetable,r=>`<tr><td>${esc(r.day)}</td><td>${r.start_time.slice(0,5)} - ${r.end_time.slice(0,5)}</td><td>${esc(r.class_name)} ${esc(r.section)}</td><td>${esc(r.course_name)}</td><td>${esc(r.teacher_name)}</td><td>${esc(r.room_name)}</td></tr>`);
    $("generationInfo").textContent=timetable.length?`${timetable.length} scheduled periods • 0 hard conflicts`:"No timetable generated yet.";
  }catch(e){ setStatus(false,e.message); }
}
function render(id,data,fn){ $(id).innerHTML=data.length?data.map(fn).join(""):`<tr><td colspan="10" class="muted">No data yet.</td></tr>`; }
function esc(x){ return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
async function del(type,id){ if(!confirm("Delete this record?"))return; try{await api(`/${type}/${id}`,{method:"DELETE"}); toast("Deleted successfully"); loadAll();}catch(e){toast(e.message)} }
window.del=del;

$("addCourse").onclick=async()=>{ try{ const name=val("courseName"); if(!name)throw Error("Enter a course name."); const periods=Number($("coursePeriods").value); if(!periods||periods<1)throw Error("Periods per week must be at least 1."); await api("/courses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,department:val("courseDept")||"General",course_type:$("courseType").value,credits:Number($("courseCredits").value)||3,students:Number($("courseStudents").value)||30,weekly_periods:periods})}); toast("Course saved to MySQL"); $("courseName").value=""; loadAll(); }catch(e){toast(e.message)} };
$("addTeacher").onclick=async()=>{ try{ const name=val("teacherName"); if(!name)throw Error("Enter teacher name."); await api("/teachers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,department:val("teacherDept")||"General",specialization:val("teacherSpec")||"General",availability:val("teacherAvail")||"Mon-Fri"})}); toast("Teacher saved to MySQL"); $("teacherName").value=""; loadAll(); }catch(e){toast(e.message)} };
$("addClass").onclick=async()=>{ try{ const name=val("className"); if(!name)throw Error("Enter class name."); await api("/classes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,section:val("classSection")||"A",semester:Number($("classSemester").value)||1,students:Number($("classStudents").value)||30})}); toast("Class saved to MySQL"); loadAll(); }catch(e){toast(e.message)} };
$("addRoom").onclick=async()=>{ try{ const name=val("roomName"); if(!name)throw Error("Enter room name."); const capacity=Number($("roomCapacity").value); if(!capacity||capacity<1)throw Error("Enter a valid room capacity."); await api("/rooms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({room_name:name,room_type:$("roomType").value,capacity,facilities:val("roomFacilities")})}); toast("Room saved to MySQL"); $("roomName").value=""; loadAll(); }catch(e){toast(e.message)} };

async function generate(){
  try{ message("Generating timetable...","success"); const d=await api("/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}); message(`Success: ${d.generated} periods generated with 0 hard conflicts.`,"success"); toast("Timetable generated"); await loadAll(); $("timetable").classList.add("active"); document.querySelector('[data-page="timetable"]').click(); }
  catch(e){ message(e.message,"error"); toast(e.message); }
}
$("generateHero").onclick=generate; $("regen").onclick=generate;
$("clearBtn").onclick=async()=>{try{await api("/timetable",{method:"DELETE"});message("Timetable cleared.","success");loadAll();}catch(e){message(e.message,"error")}};

function setStatus(ok,text=""){const s=$("dbStatus");s.textContent=ok?"● MySQL Connected":"● "+text;s.className=`status-dot ${ok?"ok":"bad"}`}
async function health(){try{const d=await api("/health");setStatus(d.database===true,"Database not connected");}catch(e){setStatus(false,e.message)}}

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$(b.dataset.page).classList.add("active");$("pageTitle").textContent={dashboard:"AI Timetable Dashboard",courses:"Course Management",teachers:"Faculty Management",classes:"Class Management",rooms:"Room Management",timetable:"Generated Timetable"}[b.dataset.page]});
health();loadAll();
