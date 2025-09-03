// lib/schedule.js

export const staff = ["Alice","Bob","Charlie","Diana","Eve"];
export const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// Initialize schedule
export function createEmptySchedule() {
  const scheduleData = {};
  staff.forEach(s => {
    scheduleData[s] = {};
    days.forEach(d => scheduleData[s][d] = {start: null, end: null});
  });
  return scheduleData;
}

// Date helpers
export function getMonday(d = new Date()) {
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  return new Date(d.setDate(diff));
}

export function getDayKeyFromDatePicker(dateString, currentMonday, days) {
  const date = new Date(dateString);
  const diff = Math.floor((date - currentMonday) / (1000 * 60 * 60 * 24));
  if (diff < 0 || diff > 6) {
    alert("Date outside current week");
    return null;
  }
  return days[diff];
}

// Add shift
export function addShiftToSchedule(scheduleData, staffName, dayKey, start, end) {
  scheduleData[staffName][dayKey] = { start, end };
}
