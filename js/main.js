/* ============================================================
   Umair Portfolio — Main JavaScript
   Scroll reveals, counters, testimonial slider, nav behavior
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // ---------- Navbar scroll effect ----------
  const navbar = document.querySelector('.navbar');
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  function handleScroll() {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Mobile menu
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      menuToggle.classList.toggle('active');
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menuToggle.classList.remove('active');
      });
    });
  }

  // ---------- Intersection Observer for scroll reveals ----------
  const revealElements = document.querySelectorAll(
    '.stat-card, .services-header, .service-card, .work-header, .work-item, .work-cta, .testimonials-header, .brands-label, .cta-box, .reveal'
  );

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Unobserve after reveal for performance
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  revealElements.forEach((el) => revealObserver.observe(el));

  // ---------- Animated Counters ----------
  const counters = document.querySelectorAll('.stat-number');
  let countersStarted = false;

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !countersStarted) {
          countersStarted = true;
          counters.forEach((counter) => animateCounter(counter));
          counterObserver.disconnect();
        }
      });
    },
    { threshold: 0.4 }
  );

  const statsSection = document.querySelector('.stats');
  if (statsSection) counterObserver.observe(statsSection);

  function animateCounter(el) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const isDecimal = el.dataset.decimal === 'true';
    const duration = 2000;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      let value;
      if (isDecimal) {
        value = (eased * target).toFixed(1);
      } else {
        value = Math.floor(eased * target);
      }

      el.textContent = value + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = (isDecimal ? target.toFixed(1) : target) + suffix;
      }
    }

    requestAnimationFrame(update);
  }

  // ---------- Testimonial Slider ----------
  const track = document.querySelector('.testimonial-track');
  const cards = document.querySelectorAll('.testimonial-card');
  const dots = document.querySelectorAll('.slider-dot');
  let currentSlide = 0;
  let autoSlideInterval;

  function goToSlide(index) {
    if (!track || cards.length === 0) return;
    currentSlide = (index + cards.length) % cards.length;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
  }

  function nextSlide() {
    goToSlide(currentSlide + 1);
  }

  // Dot click
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goToSlide(i);
      resetAutoSlide();
    });
  });

  function startAutoSlide() {
    autoSlideInterval = setInterval(nextSlide, 5500);
  }

  function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    startAutoSlide();
  }

  if (cards.length > 1) {
    startAutoSlide();
  }

  // Pause on hover
  const slider = document.querySelector('.testimonial-slider');
  if (slider) {
    slider.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
    slider.addEventListener('mouseleave', startAutoSlide);
  }

  // ---------- Smooth active nav link on scroll (optional enhancement) ----------
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-links a[href^="#"]');

  function highlightNav() {
    const scrollY = window.scrollY + 120;

    sections.forEach((section) => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollY >= top && scrollY < top + height) {
        navItems.forEach((link) => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', highlightNav, { passive: true });

  // ============================================================
  // PORTFOLIO PAGE — Filtering + Lightbox
  // ============================================================
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioCards = document.querySelectorAll('.portfolio-card');
  const portfolioEmpty = document.querySelector('.portfolio-empty');

  if (filterBtns.length && portfolioCards.length) {
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        // Update active tab
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;

        let visibleCount = 0;

        portfolioCards.forEach((card, index) => {
          const category = card.dataset.category;
          const matches = filter === 'all' || category === filter;

          if (matches) {
            card.classList.remove('hidden');
            // Re-trigger staggered reveal
            card.classList.remove('visible');
            setTimeout(() => {
              card.classList.add('visible');
            }, index * 60);
            visibleCount++;
          } else {
            card.classList.add('hidden');
            card.classList.remove('visible');
          }
        });

        if (portfolioEmpty) {
          portfolioEmpty.classList.toggle('show', visibleCount === 0);
        }
      });
    });

    // Initial staggered reveal for portfolio cards
    const portfolioObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            portfolioObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );

    portfolioCards.forEach((card) => portfolioObserver.observe(card));
  }

  // Lightbox
  const lightbox = document.querySelector('.lightbox');
  const lbImage = document.querySelector('.lightbox-image');
  const lbCategory = document.querySelector('.lb-category');
  const lbTitle = document.querySelector('.lightbox-body h2');
  const lbDesc = document.querySelector('.lightbox-body p');
  const lbClose = document.querySelector('.lightbox-close');
  const lbBackdrop = document.querySelector('.lightbox-backdrop');

  function openLightbox(card) {
    if (!lightbox) return;
    const img = card.querySelector('img');
    const title = card.querySelector('h3')?.textContent || '';
    const desc = card.querySelector('p')?.textContent || '';
    const category = card.dataset.categoryLabel || card.dataset.category || '';

    if (lbImage && img) {
      lbImage.src = img.src;
      lbImage.alt = title;
    }
    if (lbCategory) lbCategory.textContent = category;
    if (lbTitle) lbTitle.textContent = title;
    if (lbDesc) lbDesc.textContent = desc;

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  portfolioCards.forEach((card) => {
    card.addEventListener('click', () => openLightbox(card));
  });

  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbBackdrop) lbBackdrop.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  // ============================================================
  // ABOUT PAGE — Timeline + Skill Bars
  // ============================================================

  // Timeline items reveal
  const timelineItems = document.querySelectorAll('.timeline-item');
  if (timelineItems.length) {
    const timelineObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('visible');
            }, i * 120);
            timelineObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }
    );
    timelineItems.forEach((item) => timelineObserver.observe(item));
  }

  // Skill bars
  const skillItems = document.querySelectorAll('.skill-item');
  let skillsAnimated = false;

  if (skillItems.length) {
    const skillsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !skillsAnimated) {
            skillsAnimated = true;
            skillItems.forEach((item, index) => {
              setTimeout(() => {
                item.classList.add('visible');
                const fill = item.querySelector('.skill-fill');
                const percent = item.dataset.percent || 90;
                if (fill) {
                  fill.style.width = percent + '%';
                }
              }, index * 100);
            });
            skillsObserver.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );

    const skillsSection = document.querySelector('.skills-section');
    if (skillsSection) skillsObserver.observe(skillsSection);
  }

  // Generic reveal for story elements
  const aboutReveals = document.querySelectorAll('.story-content, .story-visual, .timeline-header, .skills-header');
  if (aboutReveals.length) {
    const aboutObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            aboutObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    aboutReveals.forEach((el) => {
      el.classList.add('reveal');
      aboutObserver.observe(el);
    });
  }

  // ============================================================
  // SERVICES PAGE — Service card reveals
  // ============================================================
  const serviceDetailCards = document.querySelectorAll('.service-detail-card');
  if (serviceDetailCards.length) {
    const serviceObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            serviceObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -30px 0px' }
    );
    serviceDetailCards.forEach((card, i) => {
      card.style.transitionDelay = `${i * 0.1}s`;
      serviceObserver.observe(card);
    });
  }

  // ============================================================
  // CONTACT PAGE — Form validation, prefill, submission
  // ============================================================
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    // Prefill project type from URL query
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    const projectSelect = document.getElementById('projectType');
    if (serviceParam && projectSelect) {
      const map = {
        'youtube-video-editing': 'YouTube Video Editing',
        'short-form-reels': 'Short-Form Reels Editing',
        'color-grading-sound': 'Color Grading & Sound Design',
        'channel-management': 'Full Channel Management',
        'graphic-design': 'Graphic Design',
        'uiux-design': 'UI/UX Design'
      };
      const value = map[serviceParam] || serviceParam;
      for (let i = 0; i < projectSelect.options.length; i++) {
        if (projectSelect.options[i].value === value) {
          projectSelect.selectedIndex = i;
          break;
        }
      }
    }

    // Reveal contact blocks
    const contactReveals = document.querySelectorAll('.contact-info-block, .contact-form-wrap');
    const contactObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          contactObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    contactReveals.forEach((el) => contactObs.observe(el));

    // Validation helpers
    function showError(group, msg) {
      group.classList.add('has-error');
      const err = group.querySelector('.error-msg');
      if (err) err.textContent = msg;
    }
    function clearError(group) {
      group.classList.remove('has-error');
    }

    contactForm.querySelectorAll('input, select, textarea').forEach((field) => {
      field.addEventListener('input', () => {
        const group = field.closest('.form-group');
        if (group) clearError(group);
      });
    });

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = document.getElementById('formStatus');
      statusEl.className = 'form-status';
      statusEl.style.display = 'none';

      const nameGroup = document.getElementById('name').closest('.form-group');
      const emailGroup = document.getElementById('email').closest('.form-group');
      const projectGroup = document.getElementById('projectType').closest('.form-group');
      const messageGroup = document.getElementById('message').closest('.form-group');

      let valid = true;

      const nameVal = document.getElementById('name').value.trim();
      const emailVal = document.getElementById('email').value.trim();
      const projectVal = document.getElementById('projectType').value;
      const messageVal = document.getElementById('message').value.trim();

      if (!nameVal) {
        showError(nameGroup, 'Please enter your name.');
        valid = false;
      } else clearError(nameGroup);

      if (!emailVal) {
        showError(emailGroup, 'Please enter your email.');
        valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        showError(emailGroup, 'Please enter a valid email address.');
        valid = false;
      } else clearError(emailGroup);

      if (!projectVal) {
        showError(projectGroup, 'Please select a project type.');
        valid = false;
      } else clearError(projectGroup);

      if (!messageVal) {
        showError(messageGroup, 'Please tell me about your project.');
        valid = false;
      } else if (messageVal.length < 10) {
        showError(messageGroup, 'Message is too short. Please add more detail.');
        valid = false;
      } else clearError(messageGroup);

      if (!valid) return;

      const submitBtn = contactForm.querySelector('.form-submit');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Sending…';

      // -------------------------------------------------------
      // FORM SUBMISSION INTEGRATION POINT
      // Replace the Formspree endpoint below with your own
      // (create a free form at https://formspree.io and paste the URL).
      // Until configured, the form shows a clear configuration message.
      // -------------------------------------------------------
      const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID'; // <-- REPLACE THIS

      try {
        if (FORMSPREE_ENDPOINT.includes('YOUR_FORM_ID')) {
          // Not yet configured — show honest message
          statusEl.className = 'form-status error';
          statusEl.innerHTML = 'Form is ready but not yet connected to an email service. Please configure a Formspree (or similar) endpoint in <code>js/main.js</code>, or email me directly at <a href="mailto:umairsaeed1226@gmail.com" style="color:inherit;text-decoration:underline">umairsaeed1226@gmail.com</a>.';
          statusEl.style.display = 'block';
        } else {
          const formData = new FormData(contactForm);
          const res = await fetch(FORMSPREE_ENDPOINT, {
            method: 'POST',
            body: formData,
            headers: { Accept: 'application/json' }
          });
          if (res.ok) {
            statusEl.className = 'form-status success';
            statusEl.textContent = 'Thank you! Your project inquiry has been sent. I’ll get back to you soon.';
            statusEl.style.display = 'block';
            contactForm.reset();
          } else {
            throw new Error('Submission failed');
          }
        }
      } catch (err) {
        statusEl.className = 'form-status error';
        statusEl.innerHTML = 'Something went wrong. Please try again or email me directly at <a href="mailto:umairsaeed1226@gmail.com" style="color:inherit;text-decoration:underline">umairsaeed1226@gmail.com</a>.';
        statusEl.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
});
