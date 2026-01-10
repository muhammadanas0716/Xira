let statAnimationStarted = false;

document.addEventListener("DOMContentLoaded", function () {
  initializeNavbar();
  initializeScrollAnimations();
  initializeStatAnimations();
  initializeFeatureCards();
  addEasterEggs();
  initializeWaitlistModal();
  initializeHeroEmailForm();
});

function initializeNavbar() {
  const navbar = document.getElementById("navbar");

  window.addEventListener("scroll", function () {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 20) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    const offset = 80;
    const elementPosition = section.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  }
}

function initializeScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        entry.target.classList.add("animated");
      }
    });
  }, observerOptions);

  document.querySelectorAll(".fade-in-up").forEach((el, index) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition = "opacity 0.6s ease-out, transform 0.6s ease-out";
    if (index > 0) {
      el.style.transitionDelay = `${Math.min(index * 0.1, 0.5)}s`;
    }
    observer.observe(el);
  });
}

function initializeStatAnimations() {
  const statsSection = document.querySelector(".stat-item")?.closest("section");
  if (!statsSection) return;

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !statAnimationStarted) {
          statAnimationStarted = true;
          animateStats();
        }
      });
    },
    { threshold: 0.5 }
  );

  observer.observe(statsSection);
}

function animateStats() {
  const statItems = document.querySelectorAll(".stat-item");
  statItems.forEach((item, index) => {
    setTimeout(() => {
      item.style.animation = "fadeInUp 0.6s ease-out forwards";
      item.style.opacity = "1";

      const numberEl = item.querySelector("div:first-child");
      if (numberEl && numberEl.textContent === "∞") {
        numberEl.style.animation = "pulse 2s ease-in-out infinite";
      }
    }, index * 150);
  });
}

function initializeFeatureCards() {
  const cards = document.querySelectorAll(".feature-card");
  cards.forEach((card, index) => {
    card.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-8px) scale(1.02)";
    });

    card.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0) scale(1)";
    });

    setTimeout(() => {
      card.style.opacity = "0";
      card.style.transform = "translateY(20px)";
      card.style.transition = "all 0.5s ease-out";

      const observer = new IntersectionObserver(
        function (entries) {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setTimeout(() => {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
              }, index * 100);
            }
          });
        },
        { threshold: 0.2 }
      );

      observer.observe(card);
    }, 100);
  });
}

function switchFeatureTab(tabName) {
  const tabs = document.querySelectorAll(".feature-tab");
  const panels = document.querySelectorAll(".feature-panel");

  tabs.forEach((tab) => {
    tab.classList.remove("active", "text-gray-900", "border-black");
    tab.classList.add("text-gray-600", "border-transparent");
  });

  panels.forEach((panel) => {
    panel.classList.add("hidden");
    panel.classList.remove("active");
  });

  const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
  const activePanel = document.getElementById(tabName + "Content");

  if (activeTab) {
    activeTab.classList.add("active", "text-gray-900", "border-black");
    activeTab.classList.remove("text-gray-600", "border-transparent");
  }

  if (activePanel) {
    activePanel.classList.remove("hidden");
    activePanel.classList.add("active");
  }
}

function initializeWaitlistModal() {
  const modal = document.getElementById("waitlistModal");
  const closeBtn = document.getElementById("closeWaitlistModal");
  const form = document.getElementById("waitlistForm");
  const emailInput = document.getElementById("waitlistEmail");
  const submitBtn = document.getElementById("waitlistSubmit");
  const messageDiv = document.getElementById("waitlistMessage");

  if (!modal || !closeBtn || !form) return;

  function hideModal() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function showMessage(text, isError = false) {
    messageDiv.textContent = text;
    messageDiv.className = `mt-4 text-sm text-center ${
      isError ? "text-red-600" : "text-green-600"
    }`;
    messageDiv.classList.remove("hidden");
  }

  closeBtn.addEventListener("click", hideModal);

  const backdrop = modal.querySelector(".backdrop-blur-sm");
  if (backdrop) {
    backdrop.addEventListener("click", hideModal);
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    if (!email) {
      showMessage("Please enter your email", true);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Joining...";

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage("Thanks! We'll be in touch soon.", false);
        emailInput.value = "";

        setTimeout(() => {
          hideModal();
          setTimeout(() => {
            messageDiv.classList.add("hidden");
          }, 300);
        }, 2000);
      } else {
        showMessage(
          data.error || "Something went wrong. Please try again.",
          true
        );
      }
    } catch (error) {
      showMessage("Network error. Please try again.", true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Join Waitlist";
    }
  });
}

function showWaitlistModal() {
  const modal = document.getElementById("waitlistModal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    const emailInput = document.getElementById("waitlistEmail");
    if (emailInput) {
      setTimeout(() => emailInput.focus(), 100);
    }
  }
}

function initializeHeroEmailForm() {
  const form = document.getElementById("heroEmailForm");
  const emailInput = document.getElementById("heroEmail");
  const submitBtn = document.getElementById("heroEmailSubmit");

  if (!form || !emailInput || !submitBtn) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    if (!email) {
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Joining...";

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      });

      const data = await response.json();

      if (response.ok) {
        emailInput.value = "";
        submitBtn.textContent = "Joined!";
        submitBtn.classList.add("bg-green-600");
        setTimeout(() => {
          submitBtn.textContent = "Join Waitlist";
          submitBtn.classList.remove("bg-green-600");
          submitBtn.disabled = false;
        }, 2000);
      } else {
        alert(data.error || "Something went wrong. Please try again.");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    } finally {
      if (submitBtn.textContent !== "Joined!") {
        submitBtn.disabled = false;
        submitBtn.textContent = "Join Waitlist";
      }
    }
  });
}

function addEasterEggs() {
  let clickCount = 0;
  const logo = document.querySelector(".logo-img");

  if (logo) {
    logo.addEventListener("click", function () {
      clickCount++;
      if (clickCount === 5) {
        this.style.animation = "spin 1s linear";
        setTimeout(() => {
          this.style.animation = "";
          alert(
            "You found the secret! We're actually backed by coffee. Lots of coffee."
          );
        }, 1000);
        clickCount = 0;
      }
    });
  }

  const badges = document.querySelectorAll("span");
  badges.forEach((badge) => {
    if (badge.textContent && badge.textContent.includes("Backed by nobody")) {
      badge.style.cursor = "pointer";
      badge.addEventListener("click", function () {
        const messages = [
          "We're honest, not broke.",
          "Actually, we're both.",
          "But at least we're transparent!",
          "Unlike some companies...",
          "We're looking at you, Theranos.",
        ];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        const originalText = this.textContent;
        this.textContent = randomMsg;
        setTimeout(() => {
          this.textContent = originalText;
        }, 3000);
      });
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "?" && e.shiftKey) {
      const helpText = document.createElement("div");
      helpText.className =
        "fixed bottom-4 right-4 bg-black text-white p-4 rounded-xl shadow-xl z-50 max-w-sm";

      const title = document.createElement("p");
      title.className = "text-sm font-semibold mb-2";
      title.textContent = "Pro Tips:";

      const list = document.createElement("ul");
      list.className = "text-xs space-y-1 list-disc list-inside";

      const tips = ["Click the logo 5 times", "We don't track you (seriously)"];
      tips.forEach(tip => {
        const li = document.createElement("li");
        li.textContent = tip;
        list.appendChild(li);
      });

      helpText.appendChild(title);
      helpText.appendChild(list);
      document.body.appendChild(helpText);

      setTimeout(() => {
        helpText.style.opacity = "0";
        helpText.style.transition = "opacity 0.3s";
        setTimeout(() => helpText.remove(), 300);
      }, 5000);
    }
  });
}
