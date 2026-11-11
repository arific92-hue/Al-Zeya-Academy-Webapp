(() => {
  "use strict";

  const supabaseClient = window.supabaseClient;

  // Mobile menu — preserve existing public-site behavior.
  const menuToggle = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const menuIcon = document.getElementById("menuIcon");
  const ICON_OPEN = `<path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />`;
  const ICON_CLOSE = `<path stroke-linecap="round" d="M6 6l12 12M6 18L18 6" />`;

  if (menuToggle && mobileMenu && menuIcon) {
    const closeMenu = () => {
      mobileMenu.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuIcon.innerHTML = ICON_OPEN;
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuIcon.innerHTML = isOpen ? ICON_CLOSE : ICON_OPEN;
    });

    mobileMenu.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));

    document.addEventListener("click", event => {
      if (
        mobileMenu.classList.contains("open") &&
        !mobileMenu.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        closeMenu();
      }
    });
  }

  // Load live course choices and honor ?course=... links from the public site.
  const courseField = document.getElementById("course");
  const params = new URLSearchParams(window.location.search);

  async function loadCourses() {
    if (!courseField) return;
    if (!supabaseClient) {
      courseField.innerHTML = '<option value="">Courses currently unavailable</option>';
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("courses")
        .select("name")
        .order("created_at", { ascending: false });

      courseField.innerHTML = '<option value="">Select course / jamaat</option>';

      if (error) {
        console.error("Course loading failed:", error);
        courseField.innerHTML = '<option value="">Courses currently unavailable</option>';
        return;
      }

      (Array.isArray(data) ? data : [])
        .filter(course => course && typeof course.name === "string" && course.name.trim())
        .forEach(course => {
          const option = document.createElement("option");
          option.value = course.name.trim();
          option.textContent = course.name.trim();
          courseField.appendChild(option);
        });

      const requested = (params.get("course") || "").trim();
      if (requested) {
        const match = Array.from(courseField.options).find(
          option => option.value.toLowerCase() === requested.toLowerCase()
        );
        if (match) courseField.value = match.value;
      }
    } catch (error) {
      console.error("Unexpected course loading failure:", error);
      courseField.innerHTML = '<option value="">Courses currently unavailable</option>';
    }
  }

  // Admission confirmation modal.
  const modal = document.getElementById("admissionSuccessModal");
  const modalName = document.getElementById("admissionSuccessName");
  const modalStudentId = document.getElementById("admissionSuccessStudentId");
  const modalClose = document.getElementById("admissionSuccessClose");

  function openSuccessModal(studentName, studentId) {
    if (!modal) return;
    if (modalName) modalName.textContent = studentName || "Applicant";
    if (modalStudentId) modalStudentId.textContent = studentId || "—";
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("admission-modal-open");
    window.setTimeout(() => modalClose?.focus(), 0);
  }

  function closeSuccessModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("admission-modal-open");
  }

  modalClose?.addEventListener("click", closeSuccessModal);
  modal?.addEventListener("click", event => {
    if (event.target === modal) closeSuccessModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal && !modal.hidden) closeSuccessModal();
  });

  // Admission submission.
  const form = document.getElementById("admissionForm");
  const status = document.getElementById("admissionStatus");

  function setStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = isError ? "error" : "success";
    status.hidden = !message;
  }

  if (form) {
    form.addEventListener("submit", async event => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      const button = form.querySelector(".admission-submit");
      const originalLabel = button?.textContent || "Submit Admission Application →";
      const formData = new FormData(form);
      const studentName = String(formData.get("student_name") || "").trim();

      if (!supabaseClient) {
        setStatus("The admission service is temporarily unavailable. Please try again shortly.", true);
        return;
      }

      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = "Submitting…";
      setStatus("");

      const payload = {
        p_admission_year: "2026–27",
        p_student_name: studentName,
        p_guardian_name: String(formData.get("guardian_name") || "").trim(),
        p_mobile: String(formData.get("mobile") || "").trim(),
        p_email: String(formData.get("email") || "").trim() || null,
        p_course: String(formData.get("course") || "").trim() || null,
        p_dob: String(formData.get("dob") || "").trim() || null,
        p_city: String(formData.get("city") || "").trim(),
        p_state: String(formData.get("state") || "").trim(),
        p_address: String(formData.get("address") || "").trim(),
        p_note: String(formData.get("note") || "").trim() || null
      };

      try {
        const { data, error } = await supabaseClient.rpc("submit_admission_application", payload);

        if (error) throw error;

        if (!data || data.ok !== true || !data.student_id) {
          throw new Error("The application was not acknowledged by the server.");
        }

        form.reset();
        if (courseField) courseField.value = "";

        button.textContent = "✓ Application Submitted";
        setStatus("Application submitted successfully.");
        openSuccessModal(data.student_name || studentName, data.student_id);
      } catch (error) {
        console.error("Admission submission failed:", error);
        const message = error?.message || "We could not submit your admission application right now.";
        setStatus("We could not submit your admission application. Please try again.", true);
        button.textContent = originalLabel;
      } finally {
        window.setTimeout(() => {
          if (!button) return;
          button.disabled = false;
          button.removeAttribute("aria-busy");
          if (button.textContent === "✓ Application Submitted") {
            button.textContent = originalLabel;
          }
        }, 5000);
      }
    });
  }

  // Back to top.
  const backToTop = document.getElementById("backToTop");
  if (backToTop) {
    const updateBackToTop = () => backToTop.classList.toggle("visible", window.scrollY > 500);
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    updateBackToTop();
    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  void loadCourses();
})();
