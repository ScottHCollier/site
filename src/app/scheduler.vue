<template>
  <h2>Staff Work Schedule</h2>
  <button id="openModalBtn">Add Shift</button>
  
  <!-- Modal -->
  <div id="shiftModal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h3>Add Shift</h3>
      <div style="display:flex; flex-direction:column; gap:0.5em;">
        <select id="staffSelect">
          <option value="Alice">Alice</option>
          <option value="Bob">Bob</option>
          <option value="Charlie">Charlie</option>
          <option value="Diana">Diana</option>
          <option value="Eve">Eve</option>
        </select>
        <input type="date" id="shiftDate" required>
        <input type="time" id="startTime" required>
        <input type="time" id="endTime" required>
        <button id="saveShiftBtn">Save Shift</button>
      </div>
    </div>
  </div>
  
  <!-- Calendar -->
  <div class="calendar" id="calendar"></div>
</template>

<script>
import { staff, days, createEmptySchedule, getMonday, getDayKeyFromDatePicker, addShiftToSchedule } from "../lib/schedule.js";

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
</script>

<style>
#openModalBtn {
  background:#6200ee;
  color:#fff;padding:0.5em 1em;
}

#openModalBtn:hover {
  background:#7b39ff;
}

/* Calendar */
.calendar {
    display: grid;
    grid-template-columns: 150px repeat(7,1fr);
    gap: 4px;
    margin-top: 1em;
}

.calendar div {
    padding: 0.5em;
    background: #1f1f1f;
    border-radius: 6px;
    text-align: center;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.calendar .header {
  font-weight: bold;
  background:#2c2c2c;
}

.shift-off {
  background:#333;
  color:#888;
}

.shift-full {
  background:#9a63e8;
  color:#121212;
}

/* Modal */
.modal {
    display:none;
    position:fixed;
    top:0; left:0;
    width:100%; height:100%;
    backdrop-filter: blur(4px);
    background: rgba(0,0,0,0.6);
    justify-content: center;
    align-items: center;
    z-index:100;
}

.modal-content {
    position: relative;
    background:#1e1e1e;
    padding:1em 2em;
    border-radius:8px;
    min-width:300px;
    max-width:400px;
}

.modal .close {
  position:absolute;
  top:0.5em;
  right:1em;
  cursor:pointer;
  color:#bbb;
}

.modal .close:hover {
  color:#fff;
}

select,input[type="time"],input[type="date"] {
    width:100%; padding:0.5em; margin:0.3em 0;
    border-radius:5px; border:1px solid #555;
    background:#1e1e1e; color:#e0e0e0;
}
</style>
