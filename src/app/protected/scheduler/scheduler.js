import { staff, days, createEmptySchedule, getMonday, getDayKeyFromDatePicker, addShiftToSchedule } from "../../../lib/schedule.js";

let currentMonday = getMonday();
let scheduleData = createEmptySchedule();

// Modal logic
const modal = document.getElementById("shiftModal");
document.getElementById("openModalBtn").onclick = () => modal.style.display = "flex";
modal.querySelector(".close").onclick = () => modal.style.display = "none";
window.onclick = e => { if(e.target === modal) modal.style.display = "none"; }

// Save shift button
document.getElementById("saveShiftBtn").onclick = () => {
  const staffName = document.getElementById("staffSelect").value;
  const dateValue = document.getElementById("shiftDate").value;
  if (!dateValue) return alert("Select date");

  const dayKey = getDayKeyFromDatePicker(dateValue, currentMonday, days);
  if (!dayKey) return;

  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;
  if (!start || !end) return alert("Select start/end time");

  addShiftToSchedule(scheduleData, staffName, dayKey, start, end);
  buildCalendar();
  modal.style.display = "none";

  document.getElementById("shiftDate").value = "";
  document.getElementById("startTime").value = "";
  document.getElementById("endTime").value = "";
};

// Calendar rendering
function buildCalendar() {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";
  calendar.appendChild(createCell("Staff / Day", "header"));
  days.forEach(d => calendar.appendChild(createCell(d, "header")));

  staff.forEach(s => {
    calendar.appendChild(createCell(s, "header"));
    days.forEach(d => {
      const shift = scheduleData[s][d];
      const text = shift.start && shift.end ? `${shift.start}-${shift.end}` : "Off";
      const cls = shift.start && shift.end ? "shift-full" : "shift-off";
      calendar.appendChild(createCell(text, cls));
    });
  });
}

function createCell(text, cls = "") {
  const div = document.createElement("div");
  div.innerText = text;
  if (cls) div.classList.add(cls);
  return div;
}

buildCalendar();
