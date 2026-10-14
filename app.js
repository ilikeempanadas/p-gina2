document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("form[data-validate]").forEach(form => {
    form.addEventListener("submit", event => {
      if (!form.checkValidity()) {
        event.preventDefault();
        form.reportValidity();
      }
    });
  });
  const course = document.querySelector("#course_id");
  const student = document.querySelector("#student_id");
  if (course && student) {
    const filterStudents = () => {
      const selectedCourse = course.value;
      [...student.options].forEach(option => {
        if (!option.value) { option.hidden = false; return; }
        option.hidden = !!selectedCourse && option.dataset.course !== selectedCourse;
      });
      if (student.selectedOptions[0]?.hidden) student.value = "";
    };
    course.addEventListener("change", filterStudents);
    filterStudents();
  }
  document.querySelectorAll(".alert").forEach(alert => {
    const dismiss = document.createElement("button");
    dismiss.type = "button"; dismiss.className = "alert-close"; dismiss.setAttribute("aria-label", "Cerrar mensaje"); dismiss.textContent = "×";
    dismiss.addEventListener("click", () => alert.remove());
    alert.appendChild(dismiss);
  });
});
