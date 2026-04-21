import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { siteData } from './data/siteData';
import CircularText from './CircularText';
import { firebaseAuth, firebaseConfigError } from './firebase';

const featuredProjectIds = ['project-1', 'project-2', 'project-website'];
const MAX_FEATURED_PROJECTS = 3;

function smoothScrollTo(targetTop, duration = 850) {
  const startTop = window.scrollY;
  const distance = targetTop - startTop;
  const startTime = performance.now();

  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const step = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);
    window.scrollTo(0, startTop + distance * eased);

    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };

  window.requestAnimationFrame(step);
}

function SitePreloader({ isExiting }) {
  return (
    <div 
      className={`site-preloader ${isExiting ? 'site-preloader--exit' : ''}`} 
      role="status" 
      aria-live="polite" 
      aria-label="Loading"
    >
      <div className="preloader-container">
        <CircularText
          text="IDEATE*INNOVATE*INCUBATE*"
          spinDuration={20}
          onHover="speedUp"
          className="preloader-circular"
        />
        <div className="preloader-logo">
          <img src="/media/logo.png" alt="Dnyanvishkar Logo" />
        </div>
      </div>
    </div>
  );
}

function App() {
  const location = useLocation();
  const [showPreloader, setShowPreloader] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, 2500);

    const removeTimer = window.setTimeout(() => {
      setShowPreloader(false);
    }, 3100);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Always reset scroll on page-level navigation (pathname change).
    window.scrollTo(0, 0);
    window.requestAnimationFrame(() => window.scrollTo(0, 0));

    if (location.pathname === '/' && !location.hash) {
      window.history.replaceState(null, '', '/');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const id = location.hash.replace('#', '');
    const target = document.getElementById(id);
    const navbar = document.getElementById('navbar');
    const marquee = document.getElementById('navMarquee');

    if (target) {
      if (id === 'hero') {
        window.setTimeout(() => {
          smoothScrollTo(0);
        }, 50);
        return;
      }

      const offset = (navbar?.offsetHeight || 0) + (marquee?.offsetHeight || 0);
      const top = Math.max(target.getBoundingClientRect().top + window.scrollY - offset, 0);
      window.setTimeout(() => {
        smoothScrollTo(top);
      }, 50);
    }
  }, [location]);

  return (
    <>
      {showPreloader ? <SitePreloader isExiting={isExiting} /> : null}
      <Routes>
        <Route
          path="/"
          element={
            <SiteLayout>
              <HomePage />
            </SiteLayout>
          }
        />
        <Route
          path="/projects"
          element={
            <SiteLayout>
              <ProjectsPage />
            </SiteLayout>
          }
        />
        <Route
          path="/apply"
          element={
            <SiteLayout>
              <ApplyPage />
            </SiteLayout>
          }
        />
        <Route
          path="/auth"
          element={
            <SiteLayout>
              <AuthPage />
            </SiteLayout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <SiteLayout>
              <DashboardPage />
            </SiteLayout>
          }
        />
        <Route
          path="/team"
          element={
            <SiteLayout>
              <TeamPage />
            </SiteLayout>
          }
        />
        <Route
          path="/problem-statements"
          element={
            <SiteLayout>
              <ProblemStatementsPage />
            </SiteLayout>
          }
        />
        <Route
          path="/problem-statements/:problemId"
          element={
            <SiteLayout>
              <ProblemStatementsPage />
            </SiteLayout>
          }
        />
        <Route
          path="/admin/ideas"
          element={
            <SiteLayout>
              <AdminIdeasPage />
            </SiteLayout>
          }
        />
        <Route
          path="*"
          element={
            <SiteLayout>
              <NotFoundPage />
            </SiteLayout>
          }
        />
      </Routes>
    </>
  );
}

function SiteLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const suppressSectionUpdatesRef = useRef(false);
  const suppressFrameRef = useRef(0);
  const isHome = location.pathname === '/';

  useEffect(() => {
    if (!firebaseAuth) {
      setCurrentUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!currentUser) {
      setIsAdmin(false);
      return () => {
        cancelled = true;
      };
    }

    currentUser
      .getIdToken()
      .then((token) =>
        fetch('/api/admin-auth', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      )
      .then((response) => {
        return response.json().catch(() => ({}));
      })
      .then((data) => {
        if (!cancelled) {
          setIsAdmin(data?.authorized === true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdmin(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useLayoutEffect(() => {
    if (!isHome) {
      return;
    }

    setActiveSection('hero');
    window.scrollTo(0, 0);
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  }, [isHome]);

  useEffect(() => {
    const onScroll = () => {
      const navbar = document.getElementById('navbar');
      if (navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 10);
      }

      setShowBackToTop(window.scrollY > 500);

      if (!isHome) {
        return;
      }

      if (suppressSectionUpdatesRef.current) {
        return;
      }

      const sections = Array.from(document.querySelectorAll('section[id]'));
      if (sections.length === 0) {
        return;
      }

      const marquee = document.getElementById('navMarquee');
      const headerOffset = (navbar?.offsetHeight || 0) + (marquee?.offsetHeight || 0);
      const scrollAnchor = window.scrollY + headerOffset + 8;

      let currentSection = 'hero';
      sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        if (scrollAnchor >= sectionTop) {
          currentSection = section.getAttribute('id') || currentSection;
        }
      });

      setActiveSection((prev) => (prev === currentSection ? prev : currentSection));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (suppressFrameRef.current) {
        window.cancelAnimationFrame(suppressFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isHome) {
      return;
    }

    const hashSection = location.hash ? location.hash.replace('#', '') : 'hero';
    setActiveSection(hashSection || 'hero');
  }, [isHome, location.hash]);

  useEffect(() => {
    if (!isHome) {
      return;
    }

    if (!location.hash) {
      setActiveSection('hero');
    }
  }, [isHome, location.hash]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  const navItems = useMemo(() => {
    if (isHome) {
      return [
        { label: 'Home', href: '#hero', id: 'hero' },
        { label: 'About', href: '#about', id: 'about' },
        { label: 'Our Mission', href: '#mission', id: 'mission' },
        { label: 'Projects', to: '/projects' },
        { label: 'Problem Statements', to: '/problem-statements' },
        { label: 'Our Team', to: '/team' },
        ...(currentUser
          ? isAdmin
            ? [{ label: 'Admin Panel', to: '/admin/ideas' }]
            : [{ label: 'My Dashboard', to: '/dashboard' }]
          : [{ label: 'Login', to: '/auth' }])
      ];
    }
    return [
      { label: 'Home', to: '/' },
      { label: 'About', to: '/#about' },
      { label: 'Our Mission', to: '/#mission' },
      { label: 'Projects', to: '/projects' },
      { label: 'Problem Statements', to: '/problem-statements' },
      { label: 'Our Team', to: '/team' },
      ...(currentUser
        ? isAdmin
          ? [{ label: 'Admin Panel', to: '/admin/ideas' }]
          : [{ label: 'My Dashboard', to: '/dashboard' }]
        : [{ label: 'Login', to: '/auth' }])
    ];
  }, [currentUser, isAdmin, isHome]);

  const scrollToSection = (event, id) => {
    event.preventDefault();

    const navbar = document.getElementById('navbar');
    const marquee = document.getElementById('navMarquee');
    const target = id === 'hero' ? null : document.getElementById(id);
    const top = id === 'hero'
      ? 0
      : target
        ? Math.max(
            target.getBoundingClientRect().top + window.scrollY - ((navbar?.offsetHeight || 0) + (marquee?.offsetHeight || 0)),
            0
          )
        : null;

    if (top === null) {
      return;
    }

    suppressSectionUpdatesRef.current = true;
    if (suppressFrameRef.current) {
      window.cancelAnimationFrame(suppressFrameRef.current);
    }

    const releaseWhenSettled = () => {
      if (Math.abs(window.scrollY - top) <= 2) {
        suppressSectionUpdatesRef.current = false;
        return;
      }

      suppressFrameRef.current = window.requestAnimationFrame(releaseWhenSettled);
    };

    suppressFrameRef.current = window.requestAnimationFrame(releaseWhenSettled);
    smoothScrollTo(top);
    window.history.replaceState(null, '', id === 'hero' ? '/' : `/#${id}`);
    setActiveSection(id);
  };

  return (
    <>
      {/* Mobile nav overlay */}
      <div
        className={`nav-overlay${menuOpen ? ' active' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <nav className="navbar" id="navbar">
        <div className="container">
          <div className="nav-inner">
            <Link
              to="/"
              className="nav-logo"
              id="navLogo"
              onClick={(event) => {
                if (!isHome) {
                  return;
                }

                event.preventDefault();
                window.history.replaceState(null, '', '/');
                setActiveSection('hero');
                window.scrollTo(0, 0);
              }}
            >
              <img src={siteData.brand.logo} alt="Dnyanvishkar Logo" className="nav-logo-img" />
            </Link>
            <ul className={`nav-links${menuOpen ? ' open' : ''}`} id="navLinks">
              {navItems.map((item) => (
                <li key={item.label}>
                  {item.href ? (
                    <a
                      href={item.href}
                      className={`nav-link${activeSection === item.id ? ' active' : ''}`}
                      onClick={(event) => {
                        scrollToSection(event, item.id);
                        setMenuOpen(false);
                      }}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </NavLink>
                  )}
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className="nav-link nav-cta nav-cta-button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (!currentUser) {
                      navigate('/auth', { state: { redirectTo: '/apply' } });
                      return;
                    }

                    navigate(isAdmin ? '/admin/ideas' : '/apply');
                  }}
                >
                  Apply for Incubation
                </button>
              </li>
              {currentUser ? (
                <li>
                  <button
                    type="button"
                    className="nav-link nav-logout-btn"
                    onClick={async () => {
                      if (firebaseAuth) {
                        await signOut(firebaseAuth);
                      }
                      setMenuOpen(false);
                    }}
                  >
                    Logout
                  </button>
                </li>
              ) : null}
            </ul>
            <img src="/media/CIIE_Merged_MASTER_LOGO.webp" alt="CIIE Logo" className="nav-logo-img nav-logo-img-partner" />
            <button
              className={`hamburger${menuOpen ? ' open' : ''}`}
              id="hamburger"
              aria-label="Toggle navigation"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </button>
          </div>
        </div>
      </nav>

      <div className="nav-marquee" id="navMarquee" aria-label="Dnyanavishkar slogan ticker">
        <div className="nav-marquee-track">
          <div className="nav-marquee-group">
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
          </div>
          <div className="nav-marquee-group" aria-hidden="true">
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
          </div>
          <div className="nav-marquee-group" aria-hidden="true">
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
            <span className="nav-marquee-item">IDEATE • INNOVATE • INCUBATE</span>
          </div>
        </div>
      </div>

      {children}

      <button
        type="button"
        className={`back-to-top${showBackToTop ? ' visible' : ''}`}
        aria-label="Back to top"
        onClick={() => smoothScrollTo(0)}
      >
        ↑
      </button>

      <footer className="footer" id="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <Link to="/" className="nav-logo footer-logo">
                <img src="/media/footer%20new.png" alt="Dnyanvishkar Logo" className="nav-logo-img" />
              </Link>
              <p className="footer-desc">{siteData.footer.description}</p>
            </div>
            <div className="footer-nav-group">
              {siteData.footer.columns.map((column) => (
                <div key={column.title} className="footer-nav-col">
                  <h4>{column.title}</h4>
                  {column.links.map((item) =>
                    item.to ? (
                      <Link key={item.label} to={item.to}>
                        {item.label}
                      </Link>
                    ) : (
                      <a key={item.label} href={item.href}>
                        {item.label}
                      </a>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="footer-bottom">
            <p>(c) {new Date().getFullYear()} {siteData.brand.name}. All rights reserved.</p>
            <p className="footer-credit">{siteData.footer.credit}</p>
          </div>
        </div>
      </footer>
    </>
  );
}

function HomePage() {
  const [projects, setProjects] = useState(siteData.projects);

  useEffect(() => {
    const revealTargets = document.querySelectorAll(
      '.latest-card, .about-left, .about-right, .stats-bar, .mission-inner, .pillar, .area-card, .story-card, .voices-inner, .contact-info, .cta-card, .latest-header, .stories-header, .areas-header, .project-card, .director-card, .team-member-card'
    );

    revealTargets.forEach((el) => el.classList.add('reveal-up'));

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    revealTargets.forEach((el) => revealObserver.observe(el));

    const boxes = document.querySelectorAll('.hero-stat-box');
    boxes.forEach((box) => {
      const target = Number.parseInt(box.dataset.heroCount, 10);
      const counter = box.querySelector('.hero-counter');
      if (!counter || Number.isNaN(target)) {
        return;
      }

      counter.textContent = '0';
      const duration = 2000;
      const startTime = performance.now();

      const step = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        counter.textContent = String(Math.round(eased * target));
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          counter.textContent = String(target);
          box.classList.add('counted');
        }
      };

      window.setTimeout(() => requestAnimationFrame(step), 700);
    });

    return () => revealObserver.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/projects')
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.message || 'Unable to load projects.');
        }

        return data;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }

        const nextProjects = Array.isArray(data?.projects) ? data.projects : [];
        if (nextProjects.length > 0) {
          setProjects(nextProjects);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProjects(siteData.projects);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const featuredProjects = useMemo(() => {
    const explicitFeatured = projects.filter((project) => project.featured === true);
    if (explicitFeatured.length > 0) {
      return explicitFeatured.slice(0, MAX_FEATURED_PROJECTS);
    }

    const byId = featuredProjectIds
      .map((id) => projects.find((project) => project.id === id))
      .filter(Boolean);

    if (byId.length > 0) {
      return byId.slice(0, MAX_FEATURED_PROJECTS);
    }

    return projects.slice(0, MAX_FEATURED_PROJECTS);
  }, [projects]);

  const repeatedCollaborations = [...siteData.collaborations, ...siteData.collaborations];

  return (
    <>
      <section className="hero-slider" id="hero">
        <video className="hero-bg-video" autoPlay muted loop playsInline>
          <source src="/media/bg%20video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="slides-wrapper" id="slidesWrapper">
          <div className="slide active" data-index="0">
            <div className="slide-bg" style={{ background: 'none' }}></div>
            <div className="slide-overlay" style={{ background: 'rgba(10, 37, 64, 0.55)' }}></div>
            <div className="slide-content">
              <div className="slide-content-left">
                <h1 className="slide-title slide-title-manifesto">
                  <span className="manifesto-word">IDEATE</span>
                  <span className="manifesto-word">INNOVATE</span>
                  <span className="manifesto-word">INCUBATE</span>
                </h1>
                <p className="slide-desc" style={{ maxWidth: 600 }}>
                  {siteData.homeHero.description}
                </p>
                <a href={siteData.homeHero.ctaTarget} className="slide-btn">
                  {siteData.homeHero.ctaLabel} <span className="btn-arrow" aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about" id="about">
        <div className="container">
          <div className="about-layout">
            <div className="about-left">
              <span className="section-eyebrow">{siteData.about.eyebrow}</span>
              <h2 className="section-title-serif">{siteData.about.title}</h2>
              <div className="title-line-accent"></div>
              <p className="about-lead">{siteData.about.lead}</p>
              <p className="about-tagline">{siteData.about.tagline}</p>
            </div>

            <div className="about-right">
              {siteData.about.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              <div className="about-panel">
                <h3>{siteData.about.whatWeDoTitle}</h3>
                <ul className="about-list">
                  {siteData.about.whatWeDo.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="about-panel">
                <h3>{siteData.about.highlightsTitle}</h3>
                <ul className="about-list">
                  {siteData.about.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="about-panel">
                <h3>{siteData.about.futureTitle}</h3>
                <ul className="about-list">
                  {siteData.about.futurePoints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <p className="about-closing">
                <em>{siteData.about.closingLine}</em> {siteData.about.closingDescription}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mission" id="mission">
        <video className="mission-bg-video" autoPlay muted loop playsInline>
          <source src="/media/bg%20video.mp4" type="video/mp4" />
        </video>
        <div className="mission-bg"></div>
        <div className="container">
          <div className="mission-inner">
            <span className="section-eyebrow section-eyebrow-light" style={{ display: 'block', textAlign: 'center' }}>
              {siteData.mission.eyebrow}
            </span>
            <h2 className="section-title-serif section-title-light" style={{ textAlign: 'center' }}>
              {siteData.mission.title}
            </h2>
            <div className="title-line-accent title-line-light" style={{ marginLeft: 'auto', marginRight: 'auto' }}></div>
            <blockquote className="mission-quote" style={{ textAlign: 'center' }}>
              "{siteData.mission.quote}"
            </blockquote>
            <div className="mission-pillars" style={{ textAlign: 'center' }}>
              {siteData.mission.pillars.map((pillar) => (
                <div key={pillar.id} className="pillar" style={{ textAlign: 'center' }}>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="projects-funded" id="projects">
        <div className="container">
          <div className="stories-header">
            <span className="section-eyebrow">Innovation at Work</span>
            <h2 className="section-title-serif">Projects Funded</h2>
            <div className="title-line-accent"></div>
          </div>
          <div className="projects-grid">
            {featuredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} showInternalLink />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link
              to="/projects"
              className="slide-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--clr-primary)',
                color: '#ffffff',
                padding: '14px 32px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.95rem'
              }}
            >
              View All Projects <span className="btn-arrow" aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="collaborations" id="collaborations">
        <div className="container">
          <div className="stories-header" style={{ textAlign: 'center' }}>
            <span className="section-eyebrow">Our Network</span>
            <h2 className="section-title-serif">Institutional Collaborations</h2>
            <div className="title-line-accent" style={{ margin: '16px auto 0' }}></div>
          </div>

          <div className="collab-marquee">
            <div className="collab-track">
              {repeatedCollaborations.map((name, index) => (
                <div key={`${name}-${index}`} className="collab-logo">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="voices" id="voices">
        <div className="container">
          <div className="directors-message-wrap">
            <div className="stories-header directors-header" style={{ textAlign: 'center' }}>
              <span className="section-eyebrow">{siteData.directorsMessage.eyebrow}</span>
              <h2 className="section-title-serif">{siteData.directorsMessage.title}</h2>
              <div className="title-line-accent" style={{ margin: '16px auto 0' }}></div>
            </div>

            <div className="directors-grid">
              {siteData.directorsMessage.directors.map((director) => (
                <article key={director.name} className="director-card">
                  <div className="director-photo-wrap">
                    <img src={director.photo} alt={director.name} className="director-photo" />
                  </div>
                  <div className="director-card-body">
                    <h3>{director.name}</h3>
                    {director.role ? <p className="director-role">{director.role}</p> : null}
                    <p className="director-message">{director.message}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="directors-team-cta">
              <Link to="/team" className="cta-button voices-team-btn">
                {siteData.directorsMessage.buttonLabel}
              </Link>
            </div>
          </div>

          <div className="voices-inner">
            <div className="quote-mark">"</div>
            <p className="voice-quote">{siteData.voice.quote}</p>
            <div className="voice-author">
              <div className="voice-author-info">
                <strong>{siteData.voice.author}</strong>
                <span>{siteData.voice.role}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="contact" id="contact">
        <div className="container">
          <div className="contact-grid">
            <div className="contact-panel">
              <span className="section-eyebrow">Get in Touch</span>
              <h2 className="section-title-serif">Contact Us</h2>
              <div className="title-line-accent"></div>
              <p className="contact-intro">
                We are always open to collaborations, ideas, and meaningful conversations.
                Reach out and our team will get back to you soon.
              </p>
              <div className="contact-actions">
                <a href={`mailto:${siteData.contact.email}`} className="cta-button">
                  Email Us <span className="btn-arrow" aria-hidden="true">&rarr;</span>
                </a>
                <Link to="/apply" className="slide-btn contact-secondary-btn">
                  Apply for Incubation <span className="btn-arrow" aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            <div className="contact-details contact-cards">
              <div className="contact-block contact-card">
                <h4>Office</h4>
                <p>{siteData.contact.office}</p>
              </div>
              <div className="contact-block contact-card">
                <h4>Email</h4>
                <a href={`mailto:${siteData.contact.email}`}>{siteData.contact.email}</a>
              </div>
              <div className="contact-block contact-card">
                <h4>Mobile</h4>
                <a href={`tel:${siteData.contact.phone}`}>{siteData.contact.phone}</a>
              </div>
              <div className="contact-block contact-card contact-social-card">
                <h4>Follow Us</h4>
                <div className="social-links">
                  {siteData.contact.social.map((item) => (
                    <a key={item.label} href={item.url} className="social-link" aria-label={item.label}>
                      {item.short}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ProjectsPage() {
  const [projects, setProjects] = useState(siteData.projects);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    let cancelled = false;
    setProjectsLoading(true);

    fetch('/api/projects')
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.message || 'Unable to load projects.');
        }

        return data;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }

        const nextProjects = Array.isArray(data?.projects) ? data.projects : [];
        if (nextProjects.length > 0) {
          setProjects(nextProjects);
        }
        setProjectsError('');
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setProjects(siteData.projects);
        setProjectsError(loadError.message || 'Unable to load projects.');
      })
      .finally(() => {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => ['All', ...new Set(projects.map((project) => project.category))],
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesCategory = selectedCategory === 'All' || project.category === selectedCategory;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        project.name.toLowerCase().includes(normalizedSearch) ||
        project.description.toLowerCase().includes(normalizedSearch) ||
        project.team.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [projects, searchTerm, selectedCategory]);

  return (
    <>
      <header className="page-header">
        <div className="container">
          <h1>All Funded Projects</h1>
          <p>Explore the innovative solutions and community-driven initiatives we have supported across the nation.</p>
        </div>
      </header>
      <main className="container">
        <section className="projects-toolbar" aria-label="Project filters">
          <div className="projects-toolbar-group">
            <label htmlFor="projectSearch" className="form-label">
              Search Projects
            </label>
            <input
              id="projectSearch"
              type="text"
              className="form-control"
              placeholder="Search by name, description, or team"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="projects-toolbar-group">
            <label htmlFor="projectCategoryFilter" className="form-label">
              Filter by Category
            </label>
            <select
              id="projectCategoryFilter"
              className="form-control"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="projects-results-count">
          Showing {filteredProjects.length} of {projects.length} projects
        </div>

        {projectsLoading ? <div className="admin-state" style={{ marginBottom: 16 }}>Loading projects...</div> : null}
        {!projectsLoading && projectsError ? <div className="submission-banner submission-banner--error">{projectsError}</div> : null}

        <div className="all-projects-grid">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} showInternalLink={false} />
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="projects-empty-state">
            <h3>No projects matched your search</h3>
            <p>Try a different keyword or choose another category.</p>
          </div>
        )}
      </main>
    </>
  );
}

function ProjectCard({ project, showInternalLink }) {
  const thumbnailUrl = project.thumbnailUrl || project.thumbnail || '';
  const snapshotStyle = thumbnailUrl
    ? { background: 'linear-gradient(135deg, rgba(12, 36, 61, 0.18), rgba(12, 36, 61, 0.08))' }
    : project.background
      ? { background: project.background }
      : { background: 'linear-gradient(135deg, #2a5a8c, #1a3a5c)' };

  return (
    <div className="project-card" id={project.id}>
      <div className="project-snapshot" style={snapshotStyle}>
        {thumbnailUrl ? <img src={thumbnailUrl} alt={`${project.name} thumbnail`} className="project-snapshot-image" /> : null}
      </div>
      <div className="project-info">
        <span className="project-category-chip">{project.category}</span>
        <h3 className="project-name">{project.name}</h3>
        <p className="project-desc">{project.description}</p>
        <div className="project-members">
          <strong>Team:</strong> {project.team}
        </div>

        {project.externalUrl ? (
          <a href={project.externalUrl} className="card-link" target="_blank" rel="noreferrer">
            {project.externalLabel || 'Visit Website'} <span className="btn-arrow" aria-hidden="true">&rarr;</span>
          </a>
        ) : showInternalLink ? (
          <Link to={`/projects#${project.id}`} className="card-link">
            View Project <span className="btn-arrow" aria-hidden="true">&rarr;</span>
          </Link>
        ) : (
          <a href="#" className="card-link" onClick={(event) => event.preventDefault()}>
            View Details <span className="btn-arrow" aria-hidden="true">&rarr;</span>
          </a>
        )}
      </div>
    </div>
  );
}

function ApplyPage() {
  const navigate = useNavigate();
  const [fileLabel, setFileLabel] = useState('Click or drag PDF to upload');
  const [submissionRef, setSubmissionRef] = useState('');
  const [ideaStatus, setIdeaStatus] = useState({ type: '', message: '' });
  const [isSubmittingIdea, setIsSubmittingIdea] = useState(false);
  const [problemStatus, setProblemStatus] = useState({ type: '', message: '' });
  const [isSubmittingProblem, setIsSubmittingProblem] = useState(false);
  const [activeApplySection, setActiveApplySection] = useState('idea');
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  useEffect(() => {
    if (!firebaseAuth) {
      setCurrentUser(null);
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!authReady || !currentUser) {
      setCheckingAdmin(false);
      return () => {
        cancelled = true;
      };
    }

    setCheckingAdmin(true);
    currentUser
      .getIdToken()
      .then((token) =>
        fetch('/api/admin-auth', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      )
      .then((response) => {
        return response.json().catch(() => ({}));
      })
      .then((data) => {
        if (cancelled) {
          return;
        }

        if (data?.authorized === true) {
          navigate('/admin/ideas', { replace: true });
          return;
        }

        setCheckingAdmin(false);
      })
      .catch(() => {
        if (!cancelled) {
          setCheckingAdmin(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, currentUser, navigate]);

  const applySections = [
    { id: 'idea', label: 'Student Idea Pitch' },
    { id: 'project', label: 'Organisation Project Pitch' },
    { id: 'problem', label: 'Problem Statement' }
  ];

  const onSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
      id: `DV-${Date.now().toString().slice(-6)}`,
      projectTitle: formData.get('projectTitle'),
      projectCategory: formData.get('projectCategory'),
      projectSummary: formData.get('projectSummary'),
      fundingAmount: formData.get('fundingAmount'),
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      submittedAt: new Date().toISOString()
    };

    const stored = window.localStorage.getItem('dnyanvishkar_applications');
    const records = stored ? JSON.parse(stored) : [];
    records.push(payload);
    window.localStorage.setItem('dnyanvishkar_applications', JSON.stringify(records));

    setSubmissionRef(payload.id);
    setFileLabel('Click or drag PDF to upload');
    event.currentTarget.reset();
  };

  const handleIdeaSubmit = async (event) => {
    event.preventDefault();

    if (isSubmittingIdea) {
      return;
    }

    const authUser = currentUser || firebaseAuth?.currentUser || null;

    if (!firebaseAuth || !authUser) {
      setIdeaStatus({
        type: 'error',
        message: firebaseConfigError || 'Please login before submitting your idea.'
      });
      return;
    }

    const form = event.currentTarget;

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('ideaName') || '').trim(),
      email: String(formData.get('ideaEmail') || '').trim(),
      title: String(formData.get('ideaTitle') || '').trim(),
      domain: String(formData.get('ideaDomain') || '').trim(),
      problem: String(formData.get('ideaProblem') || '').trim(),
      solution: String(formData.get('ideaSolution') || '').trim()
    };

    if (!payload.name || !payload.email || !payload.title || !payload.domain || !payload.problem || !payload.solution) {
      setIdeaStatus({ type: 'error', message: 'Please fill in all idea fields.' });
      return;
    }

    setIsSubmittingIdea(true);
    setIdeaStatus({ type: '', message: '' });

    let token = '';
    try {
      token = await authUser.getIdToken();
    } catch {
      setIsSubmittingIdea(false);
      setIdeaStatus({ type: 'error', message: 'Could not read your login session. Please try logging in again.' });
      return;
    }

    fetch('/api/submit-idea', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(async (response) => {
        let effectiveResponse = response;
        let data = await effectiveResponse.json().catch(() => ({}));

        if (effectiveResponse.status === 401) {
          const refreshedToken = await authUser.getIdToken(true);
          effectiveResponse = await fetch('/api/submit-idea', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${refreshedToken}`
            },
            body: JSON.stringify(payload)
          });
          data = await effectiveResponse.json().catch(() => ({}));
        }

        if (!effectiveResponse.ok) {
          throw new Error(data?.message || 'Unable to submit your idea.');
        }

        return data;
      })
      .then((data) => {
        const ideaRef = data?.id || `IDEA-${Date.now().toString().slice(-6)}`;
        setIdeaStatus({
          type: 'success',
          message: `Your idea has been submitted successfully. Reference ID: ${ideaRef}`
        });
        form.reset();
      })
      .catch((error) => {
        setIdeaStatus({ type: 'error', message: error.message || 'Unable to submit your idea.' });
      })
      .finally(() => {
        setIsSubmittingIdea(false);
      });
  };

  const handleProblemSubmit = async (event) => {
    event.preventDefault();

    if (isSubmittingProblem) {
      return;
    }

    const authUser = currentUser || firebaseAuth?.currentUser || null;

    if (!firebaseAuth || !authUser) {
      setProblemStatus({
        type: 'error',
        message: firebaseConfigError || 'Please login before submitting your problem statement.'
      });
      return;
    }

    const form = event.currentTarget;

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('problemName') || '').trim(),
      email: String(formData.get('problemEmail') || '').trim(),
      title: String(formData.get('problemTitle') || '').trim(),
      domain: String(formData.get('problemDomain') || '').trim(),
      description: String(formData.get('problemDescription') || '').trim(),
      outcome: String(formData.get('problemOutcome') || '').trim(),
      difficulty: String(formData.get('problemDifficulty') || '').trim(),
      deadline: String(formData.get('problemDeadline') || '').trim()
    };

    if (
      !payload.name ||
      !payload.email ||
      !payload.title ||
      !payload.domain ||
      !payload.description ||
      !payload.outcome ||
      !payload.difficulty ||
      !payload.deadline
    ) {
      setProblemStatus({ type: 'error', message: 'Please fill in all problem statement fields.' });
      return;
    }

    setIsSubmittingProblem(true);
    setProblemStatus({ type: '', message: '' });

    let token = '';
    try {
      token = await authUser.getIdToken();
    } catch {
      setIsSubmittingProblem(false);
      setProblemStatus({ type: 'error', message: 'Could not read your login session. Please try logging in again.' });
      return;
    }

    fetch('/api/submit-problem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(async (response) => {
        let effectiveResponse = response;
        let data = await effectiveResponse.json().catch(() => ({}));

        if (effectiveResponse.status === 401) {
          const refreshedToken = await authUser.getIdToken(true);
          effectiveResponse = await fetch('/api/submit-problem', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${refreshedToken}`
            },
            body: JSON.stringify(payload)
          });
          data = await effectiveResponse.json().catch(() => ({}));
        }

        if (!effectiveResponse.ok) {
          throw new Error(data?.message || 'Unable to submit your problem statement.');
        }

        return data;
      })
      .then((data) => {
        const problemRef = data?.id || `PROBLEM-${Date.now().toString().slice(-6)}`;
        setProblemStatus({
          type: 'success',
          message: `Your problem statement has been submitted successfully. Reference ID: ${problemRef}`
        });
        form.reset();
      })
      .catch((error) => {
        setProblemStatus({ type: 'error', message: error.message || 'Unable to submit your problem statement.' });
      })
      .finally(() => {
        setIsSubmittingProblem(false);
      });
  };

  return (
    <>
      <header className="page-header apply-page-header">
        <div className="container">
          <h1 className="apply-image-title">Pitch Your Idea</h1>
        </div>
      </header>

      <main className="apply-main">
        <div className="container">
          {!authReady ? <div className="admin-state">Checking account...</div> : null}
          {authReady && currentUser && checkingAdmin ? <div className="admin-state">Checking admin access...</div> : null}

          {firebaseConfigError ? <div className="submission-banner submission-banner--error">{firebaseConfigError}</div> : null}

          {authReady && !currentUser ? (
            <div className="admin-auth-card">
              <h2>Login Required</h2>
              <p>Sign in to submit ideas and track status from your dashboard.</p>
              <button type="button" className="submit-btn" onClick={() => navigate('/auth')}>
                Login or Register
              </button>
            </div>
          ) : null}

          {authReady && currentUser ? (
            <div className="submission-banner submission-banner--success">
              Logged in as <strong>{currentUser.email}</strong>. Your submissions will be linked to this account.
            </div>
          ) : null}

          {authReady && currentUser ? (
          <p className="apply-page-subtitle apply-page-subtitle--tabs">
            Choose the pitch type below and submit the form that matches your intent.
          </p>
          ) : null}

          {authReady && currentUser ? (
          <div className="apply-section-tabs" role="tablist" aria-label="Submission sections">
            {applySections.map((section) => (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={activeApplySection === section.id}
                className={`apply-section-tab${activeApplySection === section.id ? ' active' : ''}`}
                onClick={() => setActiveApplySection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>
          ) : null}

          {authReady && currentUser && activeApplySection === 'idea' ? (
            <form className="application-form idea-submission-form" onSubmit={handleIdeaSubmit}>
              {ideaStatus.message && (
                <div className={`submission-banner submission-banner--${ideaStatus.type}`} role="status">
                  {ideaStatus.message}
                </div>
              )}

              <h2 className="form-section-title">Student Idea Pitch</h2>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="ideaName">
                    Name
                  </label>
                  <input type="text" id="ideaName" name="ideaName" className="form-control" placeholder="Your full name" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ideaEmail">
                    Email
                  </label>
                  <input
                    type="email"
                    id="ideaEmail"
                    name="ideaEmail"
                    className="form-control"
                    defaultValue={currentUser.email || ''}
                    readOnly
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="ideaTitle">
                    Title
                  </label>
                  <input
                    type="text"
                    id="ideaTitle"
                    name="ideaTitle"
                    className="form-control"
                    placeholder="Short title for your idea"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ideaDomain">
                    Domain
                  </label>
                  <input
                    type="text"
                    id="ideaDomain"
                    name="ideaDomain"
                    className="form-control"
                    placeholder="Example: Education, Health, Sustainability"
                    required
                  />
                </div>
              </div>

              <div className="form-group full-width project-field-gap">
                <label className="form-label" htmlFor="ideaProblem">
                  Problem
                </label>
                <textarea
                  id="ideaProblem"
                  name="ideaProblem"
                  className="form-control"
                  placeholder="Describe the problem your idea addresses"
                  minLength="20"
                  required
                ></textarea>
              </div>

              <div className="form-group full-width proposal-upload-gap">
                <label className="form-label" htmlFor="ideaSolution">
                  Solution
                </label>
                <textarea
                  id="ideaSolution"
                  name="ideaSolution"
                  className="form-control"
                  placeholder="Explain your proposed solution and expected impact"
                  minLength="20"
                  required
                ></textarea>
              </div>

              <button type="submit" className="submit-btn" disabled={isSubmittingIdea}>
                {isSubmittingIdea ? 'Submitting...' : 'Submit Idea'}
              </button>
            </form>
          ) : null}

          {authReady && currentUser && activeApplySection === 'project' ? (
            <form className="application-form" onSubmit={onSubmit}>
              {submissionRef && (
                <div className="submission-banner" role="status">
                  Application submitted successfully. Reference ID: <strong>{submissionRef}</strong>
                </div>
              )}

              <h2 className="form-section-title">Organisation Project Pitch</h2>

              <div className="form-group full-width project-field-gap">
                <label className="form-label" htmlFor="projectTitle">
                  Project Title
                </label>
                <input
                  type="text"
                  id="projectTitle"
                  name="projectTitle"
                  className="form-control"
                  placeholder="e.g. Accessible Solar Water Filtration"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group full-width project-field-gap">
                  <label className="form-label" htmlFor="projectCategory">
                    Project Category
                  </label>
                  <select id="projectCategory" name="projectCategory" className="form-control" required>
                    <option value="">Select a category</option>
                    {siteData.applicationCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group full-width project-field-gap">
                <label className="form-label" htmlFor="projectSummary">
                  Executive Summary
                </label>
                <textarea
                  id="projectSummary"
                  name="projectSummary"
                  className="form-control"
                  placeholder="Briefly describe the core problem, your proposed solution, and the target impact metric."
                  required
                ></textarea>
              </div>

              <div className="form-group full-width funding-gap">
                <label className="form-label" htmlFor="fundingAmount">
                  Estimated Funding Amount Required (INR)
                </label>
                <input
                  type="number"
                  id="fundingAmount"
                  name="fundingAmount"
                  className="form-control"
                  placeholder="e.g. 500000"
                  required
                />
              </div>

              <h2 className="form-section-title">Primary Contact</h2>

              <div className="form-row">
                <div className="form-group full-width">
                  <label className="form-label" htmlFor="fullName">
                    Lead Applicant / Organization Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    className="form-control"
                    placeholder="Your full name or registered entity name"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label className="form-label" htmlFor="email">
                    Email Address
                  </label>
                  <input type="email" id="email" name="email" className="form-control" defaultValue={currentUser.email || ''} readOnly required />
                </div>
                <div className="form-group full-width phone-gap">
                  <label className="form-label" htmlFor="phone">
                    Phone Number
                  </label>
                  <input type="tel" id="phone" name="phone" className="form-control" placeholder="+91 XXXXX XXXXX" required />
                </div>
              </div>

              <h2 className="form-section-title proposal-title-gap">Proposal Documentation</h2>

              <div className="form-group full-width proposal-upload-gap">
                <label className="form-label" htmlFor="proposalDoc">
                  Upload Detailed Project Proposal (PDF Only)
                </label>
                <p className="proposal-hint">Ensure your document includes a timeline, itemized budget, and team profiles.</p>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="proposalDoc"
                    accept=".pdf"
                    required
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setFileLabel(file ? file.name : 'Click or drag PDF to upload');
                    }}
                  />
                  <div className="file-upload-display">
                    <span id="fileName">{fileLabel}</span>
                  </div>
                </div>
              </div>

              <button type="submit" className="submit-btn">
                Submit Application
              </button>
            </form>
          ) : null}

          {authReady && currentUser && activeApplySection === 'problem' ? (
            <form className="application-form idea-submission-form" onSubmit={handleProblemSubmit}>
              {problemStatus.message && (
                <div className={`submission-banner submission-banner--${problemStatus.type}`} role="status">
                  {problemStatus.message}
                </div>
              )}

              <h2 className="form-section-title">Problem Statement</h2>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="problemName">
                    Name
                  </label>
                  <input
                    type="text"
                    id="problemName"
                    name="problemName"
                    className="form-control"
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="problemEmail">
                    Email
                  </label>
                  <input
                    type="email"
                    id="problemEmail"
                    name="problemEmail"
                    className="form-control"
                    defaultValue={currentUser.email || ''}
                    readOnly
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="problemTitle">
                    Title
                  </label>
                  <input
                    type="text"
                    id="problemTitle"
                    name="problemTitle"
                    className="form-control"
                    placeholder="Short title for the problem statement"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="problemDomain">
                    Domain
                  </label>
                  <input
                    type="text"
                    id="problemDomain"
                    name="problemDomain"
                    className="form-control"
                    placeholder="Example: Education, Health, Sustainability"
                    required
                  />
                </div>
              </div>

              <div className="form-group full-width project-field-gap">
                <label className="form-label" htmlFor="problemDescription">
                  Description
                </label>
                <textarea
                  id="problemDescription"
                  name="problemDescription"
                  className="form-control"
                  placeholder="Describe the problem in detail"
                  minLength="20"
                  required
                ></textarea>
              </div>

              <div className="form-group full-width project-field-gap">
                <label className="form-label" htmlFor="problemOutcome">
                  Outcome
                </label>
                <textarea
                  id="problemOutcome"
                  name="problemOutcome"
                  className="form-control"
                  placeholder="What outcome or impact should the solution achieve?"
                  minLength="20"
                  required
                ></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="problemDifficulty">
                    Difficulty
                  </label>
                  <select id="problemDifficulty" name="problemDifficulty" className="form-control" required>
                    <option value="">Select difficulty</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="problemDeadline">
                    Deadline
                  </label>
                  <input type="date" id="problemDeadline" name="problemDeadline" className="form-control" required />
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={isSubmittingProblem}>
                {isSubmittingProblem ? 'Submitting...' : 'Submit Problem Statement'}
              </button>
            </form>
          ) : null}
        </div>
      </main>
    </>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const redirectTo = location.state?.redirectTo || '/dashboard';
  const googleProvider = useMemo(() => new GoogleAuthProvider(), []);

  return (
    <>
      <header className="page-header admin-page-header">
        <div className="container">
          <h1>{mode === 'login' ? 'Login' : 'Create Account'}</h1>
          <p>Access your personal dashboard to track all submissions and statuses.</p>
        </div>
      </header>

      <main className="admin-main">
        <div className="container">
          <div className="admin-auth-card">
            <div className="apply-section-tabs auth-mode-switch" role="tablist" aria-label="Auth mode">
              <button
                type="button"
                className={`apply-section-tab${mode === 'login' ? ' active' : ''}`}
                onClick={() => setMode('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={`apply-section-tab${mode === 'signup' ? ' active' : ''}`}
                onClick={() => setMode('signup')}
              >
                Register
              </button>
            </div>

            {status.message ? <div className={`submission-banner submission-banner--${status.type}`}>{status.message}</div> : null}

            <form
              className="admin-auth-form"
              onSubmit={async (event) => {
                event.preventDefault();

                if (!firebaseAuth) {
                  setStatus({
                    type: 'error',
                    message: firebaseConfigError || 'Firebase authentication is not configured.'
                  });
                  return;
                }

                setSubmitting(true);
                setStatus({ type: '', message: '' });

                try {
                  if (mode === 'login') {
                    await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
                  } else {
                    await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
                  }

                  setStatus({ type: 'success', message: 'Authentication successful. Redirecting...' });
                  navigate(redirectTo, { replace: true });
                } catch (authError) {
                  setStatus({ type: 'error', message: authError.message || 'Authentication failed.' });
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <label className="form-label" htmlFor="authEmail">Email</label>
              <input
                id="authEmail"
                type="email"
                className="form-control"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <label className="form-label" htmlFor="authPassword">Password</label>
              <input
                id="authPassword"
                type="password"
                className="form-control"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
              </button>

              <div className="auth-divider" role="separator" aria-label="Alternative sign in method">
                <span>or</span>
              </div>

              <button
                type="button"
                className="google-auth-btn"
                disabled={submitting}
                onClick={async () => {
                  if (!firebaseAuth) {
                    setStatus({
                      type: 'error',
                      message: firebaseConfigError || 'Firebase authentication is not configured.'
                    });
                    return;
                  }

                  setSubmitting(true);
                  setStatus({ type: '', message: '' });

                  try {
                    await signInWithPopup(firebaseAuth, googleProvider);
                    setStatus({ type: 'success', message: 'Google sign-in successful. Redirecting...' });
                    navigate(redirectTo, { replace: true });
                  } catch (googleAuthError) {
                    setStatus({ type: 'error', message: googleAuthError.message || 'Google sign-in failed.' });
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                <span className="google-auth-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" focusable="false">
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.8-4.1 2.8-6.9 0-.7-.1-1.4-.2-2H12z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 22c2.6 0 4.8-.9 6.4-2.5l-3.1-2.4c-.9.6-2 1-3.3 1-2.5 0-4.6-1.7-5.3-4H3.5v2.5C5.1 19.9 8.3 22 12 22z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.7 14.1c-.2-.6-.3-1.3-.3-2.1s.1-1.4.3-2.1V7.4H3.5C2.9 8.7 2.5 10.3 2.5 12s.4 3.3 1 4.6l3.2-2.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M12 5.9c1.4 0 2.7.5 3.7 1.4l2.8-2.8C16.8 2.9 14.6 2 12 2 8.3 2 5.1 4.1 3.5 7.4l3.2 2.5c.7-2.3 2.8-4 5.3-4z"
                    />
                  </svg>
                </span>
                Continue with Google
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [ideaRecords, setIdeaRecords] = useState([]);
  const [problemRecords, setProblemRecords] = useState([]);
  const [solutionRecords, setSolutionRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!firebaseAuth) {
      setCurrentUser(null);
      setReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setCurrentUser(user);
      setReady(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!ready || !currentUser) {
      setIsAdmin(false);
      return () => {
        cancelled = true;
      };
    }

    currentUser
      .getIdToken()
      .then((token) =>
        fetch('/api/admin-auth', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      )
      .then((response) => {
        return response.json().catch(() => ({}));
      })
      .then((data) => {
        if (!cancelled) {
          setIsAdmin(data?.authorized === true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdmin(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, ready]);

  useEffect(() => {
    if (ready && currentUser && isAdmin) {
      navigate('/admin/ideas', { replace: true });
    }
  }, [ready, currentUser, isAdmin, navigate]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const authUser = currentUser || firebaseAuth?.currentUser || null;

    if (!authUser) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    authUser
      .getIdToken()
      .then(async (token) => {
        let ideasRes;
        let problemsRes;
        let solutionsRes;

        const runLoad = async (resolvedToken) => {
          const [ideasResponse, problemsResponse, solutionsResponse] = await Promise.all([
            fetch('/api/my-ideas', { headers: { Authorization: `Bearer ${resolvedToken}` } }),
            fetch('/api/my-problems', { headers: { Authorization: `Bearer ${resolvedToken}` } }),
            fetch('/api/my-solutions', { headers: { Authorization: `Bearer ${resolvedToken}` } })
          ]);
          return [ideasResponse, problemsResponse, solutionsResponse];
        };

        [ideasRes, problemsRes, solutionsRes] = await runLoad(token);

        if (ideasRes.status === 401 || problemsRes.status === 401 || solutionsRes.status === 401) {
          const refreshedToken = await authUser.getIdToken(true);
          [ideasRes, problemsRes, solutionsRes] = await runLoad(refreshedToken);
        }

        return [ideasRes, problemsRes, solutionsRes];
      })
      .then(async ([ideasRes, problemsRes, solutionsRes]) => {
        const ideasData = await ideasRes.json().catch(() => ({}));
        const problemsData = await problemsRes.json().catch(() => ({}));
        const solutionsData = await solutionsRes.json().catch(() => ({}));

        if (!ideasRes.ok) {
          throw new Error(ideasData?.message || 'Unable to load your ideas.');
        }

        if (!problemsRes.ok) {
          throw new Error(problemsData?.message || 'Unable to load your problem submissions.');
        }

        if (!solutionsRes.ok) {
          throw new Error(solutionsData?.message || 'Unable to load your solutions.');
        }

        if (cancelled) {
          return;
        }

        setIdeaRecords(Array.isArray(ideasData?.ideas) ? ideasData.ideas : []);
        setProblemRecords(Array.isArray(problemsData?.problems) ? problemsData.problems : []);
        setSolutionRecords(Array.isArray(solutionsData?.solutions) ? solutionsData.solutions : []);
        setError('');
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setError(loadError.message || 'Unable to load dashboard data.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, ready]);

  return (
    <>
      <header className="page-header admin-page-header">
        <div className="container">
          <h1>My Dashboard</h1>
          <p>Track the live status of your submitted ideas and problem statements.</p>
        </div>
      </header>

      <main className="admin-main">
        <div className="container">
          {!ready ? <div className="admin-state">Checking account...</div> : null}
          {firebaseConfigError ? <div className="submission-banner submission-banner--error">{firebaseConfigError}</div> : null}
          {ready && !currentUser ? (
            <div className="admin-auth-card">
              <h2>Login Required</h2>
              <p>Please login to view your dashboard.</p>
              <button type="button" className="submit-btn" onClick={() => navigate('/auth')}>
                Login
              </button>
            </div>
          ) : null}

          {currentUser && loading ? <div className="admin-state">Loading your submissions...</div> : null}
          {currentUser && error ? <div className="submission-banner submission-banner--error admin-state">{error}</div> : null}

          {currentUser && !loading && !error ? (
            <>
              <section className="dashboard-section">
                <h2 className="dashboard-heading">My Ideas</h2>
                {ideaRecords.length === 0 ? <div className="admin-state">No idea submissions yet.</div> : null}
                {ideaRecords.length > 0 ? (
                  <div className="admin-ideas-grid">
                    {ideaRecords.map((idea) => (
                      <article key={idea.id} className="admin-idea-card">
                        <div className="admin-idea-card-header">
                          <div>
                            <span className={`admin-status admin-status--${idea.status || 'pending'}`}>
                              {idea.status || 'pending'}
                            </span>
                            <h2>{idea.title}</h2>
                          </div>
                          <span className="admin-idea-id">{idea.id}</span>
                        </div>
                        <div className="admin-idea-copy">
                          <p><strong>Problem</strong></p>
                          <p>{idea.problem}</p>
                        </div>
                        <div className="admin-idea-copy">
                          <p><strong>Solution</strong></p>
                          <p>{idea.solution}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="dashboard-section">
                <h2 className="dashboard-heading">My Problem Submissions</h2>
                {problemRecords.length === 0 ? <div className="admin-state">No problem submissions yet.</div> : null}
                {problemRecords.length > 0 ? (
                  <div className="problems-grid">
                    {problemRecords.map((problem) => (
                      <article key={problem.id} className="problem-card">
                        <div className="problem-card-header">
                          <span className={`admin-status admin-status--${problem.status || 'open'}`}>
                            {problem.status || 'open'}
                          </span>
                          <h2>{problem.title}</h2>
                        </div>
                        <div className="problem-meta">
                          <p><strong>Domain:</strong> {problem.domain}</p>
                          <p><strong>Difficulty:</strong> {problem.difficulty}</p>
                          <p><strong>Deadline:</strong> {problem.deadline ? new Date(problem.deadline).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="dashboard-section">
                <h2 className="dashboard-heading">My Solutions</h2>
                {solutionRecords.length === 0 ? <div className="admin-state">No solution submissions yet.</div> : null}
                {solutionRecords.length > 0 ? (
                  <div className="admin-ideas-grid">
                    {solutionRecords.map((solution) => (
                      <article key={solution.id} className="admin-idea-card">
                        <div className="admin-idea-card-header">
                          <div>
                            <span className={`admin-status admin-status--${solution.status || 'submitted'}`}>
                              {solution.status || 'submitted'}
                            </span>
                            <h2>{solution.problemTitle || 'Solution Submission'}</h2>
                          </div>
                          <span className="admin-idea-id">{solution.id}</span>
                        </div>
                        <div className="admin-idea-copy">
                          <p><strong>Summary</strong></p>
                          <p>{solution.summary}</p>
                        </div>
                        {solution.reviewNote ? (
                          <div className="admin-idea-copy">
                            <p><strong>Review Note</strong></p>
                            <p>{solution.reviewNote}</p>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}

function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div className="container">
        <h1>Page Not Found</h1>
        <p>The page you requested does not exist.</p>
        <Link to="/" className="slide-btn">
          Back to Home
        </Link>
      </div>
    </main>
  );
}

function TeamPage() {
  return (
    <>
      <header className="page-header">
        <div className="container">
          <h1>{siteData.teamPage.title}</h1>
          <p>{siteData.teamPage.subtitle}</p>
        </div>
      </header>

      <main className="team-main">
        <div className="container">
          <div className="team-grid">
            {siteData.teamMembers.map((member) => (
              <article key={member.name} className="team-member-card">
                <div className="team-member-photo-wrap">
                  <img src={member.photo} alt={member.name} className="team-member-photo" />
                </div>
                <h3>{member.name}</h3>
                <p>{member.role}</p>
              </article>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

function ProblemStatementsPage() {
  const navigate = useNavigate();
  const { problemId } = useParams();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedProblemId, setSelectedProblemId] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [actionStatus, setActionStatus] = useState({ type: '', message: '' });
  const [isWorking, setIsWorking] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const viewedProblemIdsRef = useRef(new Set());
  const [solutions, setSolutions] = useState([]);
  const [solutionsLoading, setSolutionsLoading] = useState(false);
  const [solutionError, setSolutionError] = useState('');
  const [solutionStatus, setSolutionStatus] = useState({ type: '', message: '' });
  const [isSolutionModalOpen, setIsSolutionModalOpen] = useState(false);
  const [isThreadModalOpen, setIsThreadModalOpen] = useState(false);
  const [solutionArchiveFile, setSolutionArchiveFile] = useState(null);
  const [solutionForm, setSolutionForm] = useState({
    summary: '',
    details: '',
    demoUrl: '',
    repoUrl: '',
    teamMembers: ''
  });

  useEffect(() => {
    if (!firebaseAuth) {
      setCurrentUser(null);
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!currentUser) {
      setIsAdmin(false);
      return () => {
        cancelled = true;
      };
    }

    currentUser
      .getIdToken()
      .then((token) =>
        fetch('/api/admin-auth', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      )
      .then((response) => {
        return response.json().catch(() => ({}));
      })
      .then((data) => {
        if (!cancelled) {
          setIsAdmin(data?.authorized === true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdmin(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    fetch('/api/problems')
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.message || 'Unable to load problem statements.');
        }

        return data;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }

        const nextProblems = Array.isArray(data?.problems) ? data.problems : [];
        setProblems(nextProblems);
        if (problemId && nextProblems.some((problem) => problem.id === problemId)) {
          setSelectedProblemId(problemId);
        } else {
          setSelectedProblemId(nextProblems[0]?.id || '');
        }
        setError('');
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setError(loadError.message || 'Unable to load problem statements.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [problemId]);

  const updateProblemInState = (nextProblem) => {
    if (!nextProblem?.id) {
      return;
    }

    setProblems((previousProblems) => {
      const index = previousProblems.findIndex((problem) => problem.id === nextProblem.id);
      if (index === -1) {
        return [nextProblem, ...previousProblems];
      }

      const updated = [...previousProblems];
      updated[index] = { ...previousProblems[index], ...nextProblem };
      return updated;
    });
  };

  const normalizedProblems = useMemo(() => {
    const tokenizeDomain = (domainText) =>
      String(domainText || '')
        .split(/[,&/]|\band\b/gi)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .slice(0, 3);

    const now = Date.now();

    return problems.map((problem) => {
      const rawStatus = String(problem.status || 'open').toLowerCase();
      const threadStatus = rawStatus === 'solved' ? 'solved' : rawStatus === 'active' ? 'active' : 'open';
      const submittedMs = problem.submittedAt ? new Date(problem.submittedAt).getTime() : now;
      const deadlineMs = problem.deadline ? new Date(problem.deadline).getTime() : Number.POSITIVE_INFINITY;
      const votes = Math.max(0, Number(problem.votes || 0));
      const comments = Array.isArray(problem.comments) ? problem.comments : [];
      const replies = Math.max(0, Number(problem.replies ?? comments.length));
      const views = Math.max(0, Number(problem.views || 0));
      const lastActivityMs = new Date(problem.lastActivityAt || problem.updatedAt || problem.submittedAt || now).getTime();
      const followers = Array.isArray(problem.followers) ? problem.followers : [];
      const votedBy = Array.isArray(problem.votedBy) ? problem.votedBy : [];
      const sortedComments = [...comments].sort(
        (left, right) => new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime()
      );

      return {
        ...problem,
        threadStatus,
        submittedMs,
        deadlineMs,
        votes,
        replies,
        views,
        lastActivityMs,
        tags: tokenizeDomain(problem.domain),
        comments: sortedComments,
        followers,
        followerCount: Math.max(0, Number(problem.followerCount ?? followers.length)),
        votedBy,
        authorName: problem.name || 'Community Partner',
        isFollowedByUser: currentUser ? followers.includes(currentUser.uid) : false,
        isVotedByUser: currentUser ? votedBy.includes(currentUser.uid) : false
      };
    });
  }, [problems, currentUser]);

  const filteredProblems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = normalizedProblems.filter((problem) => {
      const matchesStatus = statusFilter === 'all' || problem.threadStatus === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        String(problem.title || '').toLowerCase().includes(normalizedSearch) ||
        String(problem.description || '').toLowerCase().includes(normalizedSearch) ||
        String(problem.domain || '').toLowerCase().includes(normalizedSearch) ||
        problem.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch));

      return matchesStatus && matchesSearch;
    });

    const sorted = [...filtered];
    sorted.sort((left, right) => {
      if (sortBy === 'votes') {
        return right.votes - left.votes;
      }

      if (sortBy === 'deadline') {
        return left.deadlineMs - right.deadlineMs;
      }

      if (sortBy === 'newest') {
        return right.submittedMs - left.submittedMs;
      }

      return right.lastActivityMs - left.lastActivityMs;
    });

    return sorted;
  }, [normalizedProblems, searchTerm, statusFilter, sortBy]);

  useEffect(() => {
    if (filteredProblems.length === 0) {
      if (selectedProblemId) {
        setSelectedProblemId('');
      }
      return;
    }

    if (!filteredProblems.some((problem) => problem.id === selectedProblemId)) {
      setSelectedProblemId(filteredProblems[0].id);
    }
  }, [filteredProblems, selectedProblemId]);

  useEffect(() => {
    if (!problemId) {
      return;
    }

    if (normalizedProblems.some((problem) => problem.id === problemId)) {
      setSelectedProblemId(problemId);
      setIsThreadModalOpen(true);
    }
  }, [problemId, normalizedProblems]);

  const selectedProblem = useMemo(
    () => normalizedProblems.find((problem) => problem.id === selectedProblemId) || null,
    [normalizedProblems, selectedProblemId]
  );

  const statusCounts = useMemo(() => {
    return normalizedProblems.reduce(
      (accumulator, problem) => {
        accumulator.all += 1;
        if (problem.threadStatus === 'active') {
          accumulator.active += 1;
        }
        if (problem.threadStatus === 'open') {
          accumulator.open += 1;
        }
        if (problem.threadStatus === 'solved') {
          accumulator.solved += 1;
        }
        return accumulator;
      },
      { all: 0, open: 0, active: 0, solved: 0 }
    );
  }, [normalizedProblems]);

  const trendingTags = useMemo(() => {
    const tagCounter = new Map();
    normalizedProblems.forEach((problem) => {
      problem.tags.forEach((tag) => {
        const key = tag.toLowerCase();
        const current = tagCounter.get(key) || { label: tag, count: 0 };
        current.count += 1;
        tagCounter.set(key, current);
      });
    });

    return [...tagCounter.values()].sort((left, right) => right.count - left.count).slice(0, 6);
  }, [normalizedProblems]);

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) {
      return 'recently';
    }

    const elapsedMs = Date.now() - timestamp;
    const minutes = Math.max(1, Math.round(elapsedMs / (1000 * 60)));

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.round(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.round(hours / 24);
    return `${days}d ago`;
  };

  useEffect(() => {
    if (!isThreadModalOpen || !selectedProblemId) {
      return;
    }

    if (problemId !== selectedProblemId) {
      navigate(`/problem-statements/${selectedProblemId}`, { replace: true });
    }
  }, [isThreadModalOpen, navigate, problemId, selectedProblemId]);

  useEffect(() => {
    if (!isThreadModalOpen || !selectedProblemId || viewedProblemIdsRef.current.has(selectedProblemId)) {
      return;
    }

    viewedProblemIdsRef.current.add(selectedProblemId);
    fetch('/api/problem-thread-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: selectedProblemId, action: 'view' })
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return;
        }

        updateProblemInState(data.problem);
      })
      .catch(() => {
        // Ignore non-critical view tracking errors.
      });
  }, [isThreadModalOpen, selectedProblemId]);

  useEffect(() => {
    if (!isSolutionModalOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSolutionModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSolutionModalOpen]);

  useEffect(() => {
    if (!selectedProblemId) {
      setSolutions([]);
      setSolutionError('');
      return;
    }

    let cancelled = false;
    setSolutionsLoading(true);
    setSolutionError('');

    fetch(`/api/problem-solutions?problemId=${encodeURIComponent(selectedProblemId)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.message || 'Unable to load solutions.');
        }

        return data;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }

        setSolutions(Array.isArray(data?.solutions) ? data.solutions : []);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setSolutionError(loadError.message || 'Unable to load solutions.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSolutionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProblemId]);

  const resolveAuthToken = async () => {
    if (!firebaseAuth || !currentUser) {
      throw new Error(firebaseConfigError || 'Please login to continue.');
    }

    return currentUser.getIdToken();
  };

  const runThreadAction = async (action, payload = {}) => {
    if (!selectedProblem?.id || isWorking) {
      return;
    }

    setIsWorking(true);
    setActionStatus({ type: '', message: '' });

    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      if (action !== 'view') {
        const token = await resolveAuthToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/problem-thread-action', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: selectedProblem.id, action, ...payload })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to update thread.');
      }

      updateProblemInState(data.problem);
      if (action === 'comment') {
        setCommentDraft('');
      }
      setActionStatus({ type: 'success', message: data?.message || 'Thread updated.' });
    } catch (actionError) {
      setActionStatus({ type: 'error', message: actionError.message || 'Unable to update thread.' });
    } finally {
      setIsWorking(false);
    }
  };

  const handleSolutionSubmit = async (event) => {
    event.preventDefault();
    if (!selectedProblem?.id || isWorking) {
      return;
    }

    const summary = solutionForm.summary.trim();
    const details = solutionForm.details.trim();

    if (!summary || !details) {
      setSolutionStatus({ type: 'error', message: 'Solution summary and details are required.' });
      return;
    }

    setIsWorking(true);
    setSolutionStatus({ type: '', message: '' });

    try {
      const token = await resolveAuthToken();
      const formData = new FormData();
      formData.set('problemId', selectedProblem.id);
      formData.set('problemTitle', selectedProblem.title);
      formData.set('summary', summary);
      formData.set('details', details);
      formData.set('demoUrl', solutionForm.demoUrl.trim());
      formData.set('repoUrl', solutionForm.repoUrl.trim());
      formData.set('teamMembers', solutionForm.teamMembers.trim());
      if (solutionArchiveFile) {
        formData.set('codeArchive', solutionArchiveFile);
      }

      const response = await fetch('/api/submit-solution', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Unable to submit solution.');
      }

      setSolutions((previous) => [data.solution, ...previous]);
      setSolutionForm({ summary: '', details: '', demoUrl: '', repoUrl: '', teamMembers: '' });
      setSolutionArchiveFile(null);
      if (data?.archiveUploadWarning) {
        setSolutionStatus({
          type: 'error',
          message: `${data?.message || 'Solution submitted, but ZIP upload failed.'} ${data.archiveUploadWarning}`
        });
      } else {
        setSolutionStatus({ type: 'success', message: data?.message || 'Solution submitted.' });
        setIsSolutionModalOpen(false);
      }
    } catch (submitError) {
      setSolutionStatus({ type: 'error', message: submitError.message || 'Unable to submit solution.' });
    } finally {
      setIsWorking(false);
    }
  };

  const updateSolutionStatus = async (solutionId, status) => {
    if (!solutionId || isWorking) {
      return;
    }

    setIsWorking(true);
    setSolutionStatus({ type: '', message: '' });

    try {
      const token = await resolveAuthToken();
      const response = await fetch('/api/update-solution-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: solutionId,
          status
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Unable to update solution status.');
      }

      setSolutions((previous) =>
        previous.map((solution) => (solution.id === solutionId ? { ...solution, ...data.solution } : solution))
      );

      if (status === 'accepted') {
        updateProblemInState({
          id: selectedProblem.id,
          status: 'solved',
          solution: {
            solutionId: data.solution.id,
            summary: data.solution.summary,
            authorName: data.solution.authorName,
            updatedAt: data.solution.updatedAt
          }
        });
      }

      setSolutionStatus({ type: 'success', message: data?.message || 'Solution status updated.' });
    } catch (statusError) {
      setSolutionStatus({ type: 'error', message: statusError.message || 'Unable to update solution status.' });
    } finally {
      setIsWorking(false);
    }
  };

  const closeThreadModal = () => {
    setIsThreadModalOpen(false);
    setIsSolutionModalOpen(false);
    navigate('/problem-statements', { replace: true });
  };

  const openThreadModal = (id) => {
    setSelectedProblemId(id);
    setActionStatus({ type: '', message: '' });
    setSolutionStatus({ type: '', message: '' });
    setIsThreadModalOpen(true);
  };

  return (
    <>
      <header className="page-header problems-page-header">
        <div className="container">
          <h1>Problem Forum</h1>
          <p>Explore active challenges, join high-impact discussions, and choose the thread your team wants to solve.</p>
        </div>
      </header>

      <main className="problems-main">
        <div className="container problems-forum-layout">
          {loading ? <div className="admin-state">Loading problem statements...</div> : null}
          {error ? <div className="submission-banner submission-banner--error admin-state">{error}</div> : null}

          {!loading && !error && normalizedProblems.length > 0 ? (
            <>
              <aside className="forum-panel forum-panel--filters" aria-label="Forum filters">
                <h2>Filter Threads</h2>
                <div className="forum-filter-group">
                  <label htmlFor="forumSearch" className="form-label">Search</label>
                  <input
                    id="forumSearch"
                    className="form-control"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search title, tag, or domain"
                  />
                </div>

                <div className="forum-filter-group">
                  <p className="forum-filter-label">Status</p>
                  <div className="forum-pill-row">
                    <button
                      type="button"
                      className={`forum-pill${statusFilter === 'all' ? ' is-active' : ''}`}
                      onClick={() => setStatusFilter('all')}
                    >
                      All ({statusCounts.all})
                    </button>
                    <button
                      type="button"
                      className={`forum-pill${statusFilter === 'open' ? ' is-active' : ''}`}
                      onClick={() => setStatusFilter('open')}
                    >
                      Open ({statusCounts.open})
                    </button>
                    <button
                      type="button"
                      className={`forum-pill${statusFilter === 'active' ? ' is-active' : ''}`}
                      onClick={() => setStatusFilter('active')}
                    >
                      In Progress ({statusCounts.active})
                    </button>
                    <button
                      type="button"
                      className={`forum-pill${statusFilter === 'solved' ? ' is-active' : ''}`}
                      onClick={() => setStatusFilter('solved')}
                    >
                      Solved ({statusCounts.solved})
                    </button>
                  </div>
                </div>

                <div className="forum-filter-group">
                  <label htmlFor="forumSort" className="form-label">Sort by</label>
                  <select
                    id="forumSort"
                    className="form-control"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                  >
                    <option value="recent">Recent Activity</option>
                    <option value="newest">Newest</option>
                    <option value="votes">Most Voted</option>
                    <option value="deadline">Closest Deadline</option>
                  </select>
                </div>

                <Link to="/apply" className="slide-btn forum-action-btn">
                  Post Problem Statement <span className="btn-arrow" aria-hidden="true">&rarr;</span>
                </Link>

                <div className="forum-side-section">
                  <h3>Trending Tags</h3>
                  <div className="thread-tags">
                    {trendingTags.length > 0
                      ? trendingTags.map((tag) => (
                        <span key={tag.label} className="thread-tag">#{tag.label} ({tag.count})</span>
                      ))
                      : <span className="thread-tag">No tags yet</span>}
                  </div>
                </div>
              </aside>

              <section className="forum-panel forum-panel--threads" aria-label="Forum thread list">
                <div className="forum-results-bar">
                  <p>
                    Showing <strong>{filteredProblems.length}</strong> of <strong>{normalizedProblems.length}</strong> threads
                  </p>
                </div>

                {authReady && !currentUser ? (
                  <p className="forum-auth-note">Login to vote, follow threads, and add comments.</p>
                ) : null}

                {filteredProblems.length === 0 ? (
                  <div className="admin-state">No thread matches your current filters.</div>
                ) : (
                  <div className="problems-thread-list">
                    {filteredProblems.map((problem) => (
                      <article
                        key={problem.id}
                        className={`problem-thread-card${selectedProblem?.id === problem.id ? ' is-active' : ''}`}
                      >
                        <div className="thread-top-row">
                          <span className={`thread-status thread-status--${problem.threadStatus}`}>
                            {problem.threadStatus === 'solved'
                              ? 'Solved'
                              : problem.threadStatus === 'active'
                                ? 'In Progress'
                                : 'Open'}
                          </span>
                          <span className="thread-time">Active {formatRelativeTime(problem.lastActivityMs)}</span>
                        </div>

                        <h3>{problem.title}</h3>
                        <p className="thread-description">{problem.description}</p>

                        <div className="thread-tags">
                          {problem.tags.length > 0
                            ? problem.tags.map((tag) => (
                              <span key={`${problem.id}-${tag}`} className="thread-tag">#{tag}</span>
                            ))
                            : <span className="thread-tag">#General</span>}
                        </div>

                        <div className="thread-footer">
                          <div className="thread-stats" aria-label="Thread stats">
                            <span>{problem.votes} votes</span>
                            <span>{problem.replies} replies</span>
                            <span>{problem.views} views</span>
                            <span>{problem.followerCount} following</span>
                          </div>
                          <button
                            type="button"
                            className="thread-open-btn"
                            onClick={() => openThreadModal(problem.id)}
                          >
                            Open Thread
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}

          {isThreadModalOpen && selectedProblem ? (
            <div className="thread-modal-overlay" role="presentation" onClick={closeThreadModal}>
              <div
                className="thread-modal-panel"
                role="dialog"
                aria-modal="true"
                aria-label="Thread details"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="thread-modal-head">
                  <h3>Thread Details</h3>
                  <button type="button" className="solution-modal-close" onClick={closeThreadModal} aria-label="Close thread">
                    ×
                  </button>
                </div>

                <div className="thread-detail-head">
                  <span className={`thread-status thread-status--${selectedProblem.threadStatus}`}>
                    {selectedProblem.threadStatus === 'solved'
                      ? 'Solved'
                      : selectedProblem.threadStatus === 'active'
                        ? 'In Progress'
                        : 'Open'}
                  </span>
                  <h2>{selectedProblem.title}</h2>
                  <p>Posted by {selectedProblem.authorName}</p>
                </div>

                <div className="thread-actions" aria-label="Thread actions">
                  <button
                    type="button"
                    className={`thread-action-btn${selectedProblem.isVotedByUser ? ' is-selected' : ''}`}
                    onClick={() => runThreadAction('vote')}
                    disabled={isWorking}
                  >
                    {selectedProblem.isVotedByUser ? 'Voted' : 'Upvote'} ({selectedProblem.votes})
                  </button>
                  <button
                    type="button"
                    className={`thread-action-btn${selectedProblem.isFollowedByUser ? ' is-selected' : ''}`}
                    onClick={() => runThreadAction('follow')}
                    disabled={isWorking}
                  >
                    {selectedProblem.isFollowedByUser ? 'Following' : 'Follow'} ({selectedProblem.followerCount})
                  </button>
                </div>

                <div className="thread-detail-meta">
                  <p><strong>Domain:</strong> {selectedProblem.domain || 'General'}</p>
                  <p><strong>Difficulty:</strong> {selectedProblem.difficulty || 'Not specified'}</p>
                  <p>
                    <strong>Deadline:</strong>{' '}
                    {selectedProblem.deadline ? new Date(selectedProblem.deadline).toLocaleDateString() : 'Flexible'}
                  </p>
                </div>

                <div className="thread-detail-section">
                  <h3>Problem Statement</h3>
                  <p>{selectedProblem.description}</p>
                </div>

                <div className="thread-detail-section">
                  <h3>Expected Outcome</h3>
                  <p>{selectedProblem.outcome}</p>
                </div>

                <div className="thread-detail-section">
                  <h3>Submit Solution</h3>
                  {authReady && !currentUser ? (
                    <button
                      type="button"
                      className="submit-btn"
                      onClick={() => navigate('/auth', { state: { redirectTo: `/problem-statements/${selectedProblem.id}` } })}
                    >
                      Login to Submit
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="thread-action-btn thread-action-btn--primary"
                      onClick={() => {
                        setSolutionStatus({ type: '', message: '' });
                        setIsSolutionModalOpen(true);
                      }}
                    >
                      Open Solution Form
                    </button>
                  )}
                </div>

                {isSolutionModalOpen ? (
                  <div
                    className="solution-modal-overlay"
                    role="presentation"
                    onClick={() => setIsSolutionModalOpen(false)}
                  >
                    <div
                      className="solution-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-label="Submit your solution"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="solution-modal-head">
                        <h3>Submit Your Solution</h3>
                        <button
                          type="button"
                          className="solution-modal-close"
                          aria-label="Close solution form"
                          onClick={() => setIsSolutionModalOpen(false)}
                        >
                          ×
                        </button>
                      </div>
                      <form className="solution-submit-form" onSubmit={handleSolutionSubmit}>
                        <input
                          className="form-control"
                          placeholder="Approach summary"
                          value={solutionForm.summary}
                          onChange={(event) => setSolutionForm((previous) => ({ ...previous, summary: event.target.value }))}
                        />
                        <textarea
                          className="form-control"
                          rows={4}
                          placeholder="Detailed solution"
                          value={solutionForm.details}
                          onChange={(event) => setSolutionForm((previous) => ({ ...previous, details: event.target.value }))}
                        />
                        <input
                          className="form-control"
                          placeholder="Demo URL (optional)"
                          value={solutionForm.demoUrl}
                          onChange={(event) => setSolutionForm((previous) => ({ ...previous, demoUrl: event.target.value }))}
                        />
                        <input
                          className="form-control"
                          placeholder="Repository URL (optional)"
                          value={solutionForm.repoUrl}
                          onChange={(event) => setSolutionForm((previous) => ({ ...previous, repoUrl: event.target.value }))}
                        />
                        <input
                          className="form-control"
                          placeholder="Team members (optional)"
                          value={solutionForm.teamMembers}
                          onChange={(event) => setSolutionForm((previous) => ({ ...previous, teamMembers: event.target.value }))}
                        />
                        <div className="solution-file-input-wrap">
                          <label htmlFor="solutionArchiveFile" className="form-label">Code Archive (.zip, optional)</label>
                          <input
                            id="solutionArchiveFile"
                            type="file"
                            className="form-control"
                            accept=".zip,application/zip,application/x-zip-compressed"
                            onChange={(event) => {
                              const file = event.target.files?.[0] || null;
                              setSolutionArchiveFile(file);
                            }}
                          />
                          {solutionArchiveFile ? (
                            <p className="thread-comment-meta">Selected: {solutionArchiveFile.name}</p>
                          ) : null}
                        </div>
                        <div className="thread-actions">
                          <button type="submit" className="thread-action-btn thread-action-btn--primary" disabled={isWorking}>
                            Submit Solution
                          </button>
                          <button
                            type="button"
                            className="thread-action-btn"
                            onClick={() => setIsSolutionModalOpen(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : null}

                <div className="thread-detail-section">
                  <h3>Submitted Solutions</h3>
                  {solutionsLoading ? <p>Loading solutions...</p> : null}
                  {solutionError ? <p>{solutionError}</p> : null}

                  {!solutionsLoading && !solutionError && solutions.length === 0 ? (
                    <p>No solutions yet. Be the first to submit.</p>
                  ) : null}

                  {!solutionsLoading && !solutionError && solutions.length > 0 ? (
                    <div className="solution-list">
                      {solutions.map((solution) => (
                        <article key={solution.id} className="solution-card">
                          <div className="solution-card-head">
                            <span className={`admin-status admin-status--${solution.status || 'submitted'}`}>
                              {solution.status || 'submitted'}
                            </span>
                            <span className="thread-time">{formatRelativeTime(new Date(solution.submittedAt).getTime())}</span>
                          </div>
                          <p className="thread-comment-meta">
                            <strong>{solution.authorName || solution.userEmail || 'Community User'}</strong>
                          </p>
                          <p><strong>{solution.summary}</strong></p>
                          <p>{solution.details}</p>
                          {solution.codeArchiveUrl ? (
                            <p>
                              <a href={solution.codeArchiveUrl} target="_blank" rel="noreferrer">
                                Download Code Archive {solution.codeArchiveName ? `(${solution.codeArchiveName})` : ''}
                              </a>
                            </p>
                          ) : null}
                          {(solution.demoUrl || solution.repoUrl) ? (
                            <div className="solution-links">
                              {solution.demoUrl ? (
                                <a href={solution.demoUrl} target="_blank" rel="noreferrer">Live Demo</a>
                              ) : null}
                              {solution.repoUrl ? (
                                <a href={solution.repoUrl} target="_blank" rel="noreferrer">Repository</a>
                              ) : null}
                            </div>
                          ) : null}

                          {isAdmin ? (
                            <div className="thread-actions">
                              <button
                                type="button"
                                className="thread-action-btn"
                                onClick={() => updateSolutionStatus(solution.id, 'under_review')}
                                disabled={isWorking}
                              >
                                Under Review
                              </button>
                              <button
                                type="button"
                                className="thread-action-btn"
                                onClick={() => updateSolutionStatus(solution.id, 'shortlisted')}
                                disabled={isWorking}
                              >
                                Shortlist
                              </button>
                              <button
                                type="button"
                                className="thread-action-btn thread-action-btn--primary"
                                onClick={() => updateSolutionStatus(solution.id, 'accepted')}
                                disabled={isWorking}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="thread-action-btn"
                                onClick={() => updateSolutionStatus(solution.id, 'rejected')}
                                disabled={isWorking}
                              >
                                Reject
                              </button>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>

                {selectedProblem.threadStatus === 'solved' && selectedProblem.solution?.summary ? (
                  <div className="thread-detail-section thread-detail-section--solution">
                    <h3>Accepted Solution</h3>
                    <p>{selectedProblem.solution.summary}</p>
                  </div>
                ) : null}

                <div className="thread-detail-section">
                  <h3>Thread Activity</h3>
                  <ul className="thread-timeline">
                    <li>Thread posted {formatRelativeTime(selectedProblem.submittedMs)}</li>
                    <li>Last reply {formatRelativeTime(selectedProblem.lastActivityMs)}</li>
                    <li>{selectedProblem.replies} collaborators discussing solution paths</li>
                  </ul>
                </div>

                <div className="thread-detail-section">
                  <h3>Discussion</h3>
                  {selectedProblem.comments.length === 0 ? (
                    <p>No comments yet. Start the conversation.</p>
                  ) : (
                    <div className="thread-comments-list">
                      {selectedProblem.comments.map((comment) => (
                        <article key={comment.id} className="thread-comment-item">
                          <p className="thread-comment-meta">
                            <strong>{comment.authorName || comment.userEmail || 'Community User'}</strong> · {formatRelativeTime(new Date(comment.createdAt).getTime())}
                          </p>
                          <p>{comment.message}</p>
                        </article>
                      ))}
                    </div>
                  )}

                  <form
                    className="thread-comment-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const message = commentDraft.trim();
                      if (!message) {
                        setActionStatus({ type: 'error', message: 'Type a comment before posting.' });
                        return;
                      }
                      runThreadAction('comment', { message });
                    }}
                  >
                    <textarea
                      className="form-control"
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder="Add your perspective or solution idea..."
                      rows={4}
                    />
                    <button type="submit" className="thread-action-btn thread-action-btn--primary" disabled={isWorking}>
                      Post Comment
                    </button>
                  </form>
                </div>

                {actionStatus.message ? (
                  <div className={`submission-banner submission-banner--${actionStatus.type}`} role="status">
                    {actionStatus.message}
                  </div>
                ) : null}

                {solutionStatus.message ? (
                  <div className={`submission-banner submission-banner--${solutionStatus.type}`} role="status">
                    {solutionStatus.message}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {!loading && !error && normalizedProblems.length === 0 ? (
            <div className="admin-state">No active problem statements are available right now.</div>
          ) : null}
        </div>
      </main>
    </>
  );
}

function AdminIdeasPage() {
  const ideaStatusSections = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' }
  ];
  const managementSections = [
    { id: 'ideas', label: 'Ideas' },
    { id: 'projects', label: 'Projects' },
    { id: 'problems', label: 'Problems' }
  ];
  const createEmptyProjectForm = () => ({
    name: '',
    description: '',
    team: '',
    category: '',
    thumbnailUrl: '',
    externalUrl: '',
    externalLabel: '',
    featured: false
  });

  const [activeManagementSection, setActiveManagementSection] = useState('ideas');
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingIdeaId, setUpdatingIdeaId] = useState('');
  const [activeAdminSection, setActiveAdminSection] = useState('pending');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectError, setProjectError] = useState('');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [problems, setProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [problemsError, setProblemsError] = useState('');
  const [problemSearchQuery, setProblemSearchQuery] = useState('');
  const [updatingProblemId, setUpdatingProblemId] = useState('');
  const [solutions, setSolutions] = useState([]);
  const [solutionsLoading, setSolutionsLoading] = useState(true);
  const [solutionsError, setSolutionsError] = useState('');
  const [updatingSolutionId, setUpdatingSolutionId] = useState('');
  const [isAdminSolutionsModalOpen, setIsAdminSolutionsModalOpen] = useState(false);
  const [selectedProblemForSolutions, setSelectedProblemForSolutions] = useState(null);
  const [projectForm, setProjectForm] = useState(createEmptyProjectForm);
  const [editingProjectId, setEditingProjectId] = useState('');
  const [savingProject, setSavingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState('');
  const [thumbnailUploadLabel, setThumbnailUploadLabel] = useState('No file selected');
  const projectEditorRef = useRef(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  useEffect(() => {
    if (!firebaseAuth) {
      setIsAuthorized(false);
      setAdminToken('');
      setIdeas([]);
      setAuthError(firebaseConfigError || 'Firebase admin auth is not configured.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        setIsAuthorized(false);
        setAdminToken('');
        setIdeas([]);
        setProjects([]);
        setProblems([]);
        setSolutions([]);
        setIsAdminSolutionsModalOpen(false);
        setSelectedProblemForSolutions(null);
        setLoading(false);
        setProjectsLoading(false);
        setProblemsLoading(false);
        setSolutionsLoading(false);
        return;
      }

      const token = await user.getIdToken();
      setAdminToken(token);
      setIsAuthorized(true);
      setAuthError('');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const resolveAdminToken = () => {
    return firebaseAuth.currentUser
      ? firebaseAuth.currentUser.getIdToken()
      : Promise.resolve(adminToken);
  };

  const loadIdeas = useMemo(() => {
    return () => {
      let cancelled = false;

      if (!isAuthorized || !adminToken) {
        setLoading(false);
        return () => {
          cancelled = true;
        };
      }

      setLoading(true);
      const tokenPromise = firebaseAuth.currentUser
        ? firebaseAuth.currentUser.getIdToken()
        : Promise.resolve(adminToken);

      tokenPromise
        .then((resolvedToken) =>
          fetch('/api/ideas', {
            headers: {
              Authorization: `Bearer ${resolvedToken}`
            }
          })
        )
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data?.message || 'Unable to load ideas.');
          }

          return data;
        })
        .then((data) => {
          if (cancelled) {
            return;
          }

          setIdeas(Array.isArray(data?.ideas) ? data.ideas : []);
          setError('');
        })
        .catch((loadError) => {
          if (cancelled) {
            return;
          }

          setError(loadError.message || 'Unable to load ideas.');
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    };
  }, [adminToken, isAuthorized]);

  useEffect(() => {
    const cancelLoad = loadIdeas();

    return () => {
      if (typeof cancelLoad === 'function') {
        cancelLoad();
      }
    };
  }, [loadIdeas]);

  const loadProjects = useMemo(() => {
    return () => {
      let cancelled = false;

      if (!isAuthorized || !adminToken) {
        setProjectsLoading(false);
        return () => {
          cancelled = true;
        };
      }

      setProjectsLoading(true);
      resolveAdminToken()
        .then((resolvedToken) =>
          fetch('/api/admin-projects', {
            headers: {
              Authorization: `Bearer ${resolvedToken}`
            }
          })
        )
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data?.message || 'Unable to load projects.');
          }

          return data;
        })
        .then((data) => {
          if (cancelled) {
            return;
          }

          setProjects(Array.isArray(data?.projects) ? data.projects : []);
          setProjectError('');
        })
        .catch((loadError) => {
          if (cancelled) {
            return;
          }

          setProjectError(loadError.message || 'Unable to load projects.');
        })
        .finally(() => {
          if (!cancelled) {
            setProjectsLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    };
  }, [adminToken, isAuthorized]);

  useEffect(() => {
    const cancelLoad = loadProjects();

    return () => {
      if (typeof cancelLoad === 'function') {
        cancelLoad();
      }
    };
  }, [loadProjects]);

  const loadProblems = useMemo(() => {
    return () => {
      let cancelled = false;

      if (!isAuthorized || !adminToken) {
        setProblemsLoading(false);
        return () => {
          cancelled = true;
        };
      }

      setProblemsLoading(true);
      resolveAdminToken()
        .then((resolvedToken) =>
          fetch('/api/admin-problems', {
            headers: {
              Authorization: `Bearer ${resolvedToken}`
            }
          })
        )
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data?.message || 'Unable to load problems.');
          }

          return data;
        })
        .then((data) => {
          if (cancelled) {
            return;
          }

          setProblems(Array.isArray(data?.problems) ? data.problems : []);
          setProblemsError('');
        })
        .catch((loadError) => {
          if (cancelled) {
            return;
          }

          setProblemsError(loadError.message || 'Unable to load problems.');
        })
        .finally(() => {
          if (!cancelled) {
            setProblemsLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    };
  }, [adminToken, isAuthorized]);

  useEffect(() => {
    const cancelLoad = loadProblems();

    return () => {
      if (typeof cancelLoad === 'function') {
        cancelLoad();
      }
    };
  }, [loadProblems]);

  const loadSolutions = useMemo(() => {
    return () => {
      let cancelled = false;

      if (!isAuthorized || !adminToken) {
        setSolutionsLoading(false);
        return () => {
          cancelled = true;
        };
      }

      setSolutionsLoading(true);
      resolveAdminToken()
        .then((resolvedToken) =>
          fetch('/api/admin-solutions', {
            headers: {
              Authorization: `Bearer ${resolvedToken}`
            }
          })
        )
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data?.message || 'Unable to load solutions.');
          }

          return data;
        })
        .then((data) => {
          if (cancelled) {
            return;
          }

          setSolutions(Array.isArray(data?.solutions) ? data.solutions : []);
          setSolutionsError('');
        })
        .catch((loadError) => {
          if (cancelled) {
            return;
          }

          setSolutionsError(loadError.message || 'Unable to load solutions.');
        })
        .finally(() => {
          if (!cancelled) {
            setSolutionsLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    };
  }, [adminToken, isAuthorized]);

  useEffect(() => {
    const cancelLoad = loadSolutions();

    return () => {
      if (typeof cancelLoad === 'function') {
        cancelLoad();
      }
    };
  }, [loadSolutions]);

  const updateIdeaStatus = (ideaId, nextStatus) => {
    if (updatingIdeaId || !adminToken) {
      return;
    }

    setUpdatingIdeaId(ideaId);
    setError('');

    resolveAdminToken()
      .then((resolvedToken) =>
        fetch('/api/update-idea-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resolvedToken}`
          },
          body: JSON.stringify({ id: ideaId, status: nextStatus })
        })
      )
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.message || 'Unable to update idea status.');
        }

        return data;
      })
      .then((data) => {
        const updatedIdea = data?.idea;
        if (updatedIdea) {
          setIdeas((currentIdeas) =>
            currentIdeas.map((idea) => (idea.id === updatedIdea.id ? updatedIdea : idea))
          );
        }
      })
      .catch((updateError) => {
        setError(updateError.message || 'Unable to update idea status.');
      })
      .finally(() => {
        setUpdatingIdeaId('');
      });
  };

  const updateProjectFormField = (field, value) => {
    setProjectForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const resetProjectForm = () => {
    setProjectForm(createEmptyProjectForm());
    setEditingProjectId('');
    setProjectError('');
    setThumbnailUploadLabel('No file selected');
  };

  const startProjectEdit = (project) => {
    setEditingProjectId(project.id);
    setProjectForm({
      name: project.name || '',
      description: project.description || '',
      team: project.team || '',
      category: project.category || '',
      thumbnailUrl: project.thumbnailUrl || project.thumbnail || '',
      externalUrl: project.externalUrl || '',
      externalLabel: project.externalLabel || '',
      featured: Boolean(project.featured)
    });
    setThumbnailUploadLabel('No file selected');
    setProjectError('');

    window.requestAnimationFrame(() => {
      projectEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const nameInput = document.getElementById('projectCardName');
      if (nameInput) {
        nameInput.focus();
      }
    });
  };

  const handleProjectThumbnailUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setProjectError('Please upload an image file for thumbnail.');
      return;
    }

    // Keep base64 image small enough for Firestore document limits.
    if (file.size > 450 * 1024) {
      setProjectError('Thumbnail image is too large. Please use an image smaller than 450 KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setProjectError('Unable to read image file. Please try another image.');
        return;
      }

      updateProjectFormField('thumbnailUrl', result);
      setThumbnailUploadLabel(file.name);
      setProjectError('');
    };
    reader.onerror = () => {
      setProjectError('Unable to read image file. Please try another image.');
    };

    reader.readAsDataURL(file);
  };

  const saveProject = (event) => {
    event.preventDefault();

    if (savingProject || !adminToken) {
      return;
    }

    const payload = {
      id: editingProjectId,
      name: projectForm.name.trim(),
      description: projectForm.description.trim(),
      team: projectForm.team.trim(),
      category: projectForm.category.trim(),
      thumbnailUrl: projectForm.thumbnailUrl.trim(),
      externalUrl: projectForm.externalUrl.trim(),
      externalLabel: projectForm.externalLabel.trim(),
      featured: Boolean(projectForm.featured)
    };

    if (!payload.name || !payload.description || !payload.team || !payload.category) {
      setProjectError('Name, description, team, and category are required.');
      return;
    }

    setSavingProject(true);
    setProjectError('');

    const endpoint = editingProjectId ? '/api/update-project' : '/api/admin-projects';

    resolveAdminToken()
      .then((resolvedToken) =>
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resolvedToken}`
          },
          body: JSON.stringify(payload)
        })
      )
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.message || 'Unable to save project.');
        }

        return data;
      })
      .then((data) => {
        const savedProject = data?.project;
        if (!savedProject) {
          return;
        }

        if (editingProjectId) {
          setProjects((currentProjects) =>
            currentProjects.map((project) => (project.id === savedProject.id ? savedProject : project))
          );
        } else {
          setProjects((currentProjects) => [savedProject, ...currentProjects]);
        }

        resetProjectForm();
      })
      .catch((saveError) => {
        setProjectError(saveError.message || 'Unable to save project.');
      })
      .finally(() => {
        setSavingProject(false);
      });
  };

  const removeProject = (projectId) => {
    if (deletingProjectId || !adminToken) {
      return;
    }

    const shouldDelete = window.confirm('Delete this project card from the Projects section?');
    if (!shouldDelete) {
      return;
    }

    setDeletingProjectId(projectId);
    setProjectError('');

    resolveAdminToken()
      .then((resolvedToken) =>
        fetch('/api/delete-project', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resolvedToken}`
          },
          body: JSON.stringify({ id: projectId })
        })
      )
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.message || 'Unable to delete project.');
        }

        return data;
      })
      .then(() => {
        setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectId));
        if (editingProjectId === projectId) {
          resetProjectForm();
        }
      })
      .catch((deleteError) => {
        setProjectError(deleteError.message || 'Unable to delete project.');
      })
      .finally(() => {
        setDeletingProjectId('');
      });
  };

  const updateAdminProblemStatus = (problemId, status) => {
    if (!problemId || updatingProblemId || !adminToken) {
      return;
    }

    setUpdatingProblemId(problemId);
    setProblemsError('');

    resolveAdminToken()
      .then((resolvedToken) =>
        fetch('/api/update-problem-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resolvedToken}`
          },
          body: JSON.stringify({ id: problemId, status })
        })
      )
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.message || 'Unable to update problem status.');
        }

        return data;
      })
      .then((data) => {
        const updatedProblem = data?.problem;
        if (updatedProblem) {
          setProblems((currentProblems) =>
            currentProblems.map((problem) => (problem.id === updatedProblem.id ? updatedProblem : problem))
          );
        }
      })
      .catch((updateError) => {
        setProblemsError(updateError.message || 'Unable to update problem status.');
      })
      .finally(() => {
        setUpdatingProblemId('');
      });
  };

  const updateAdminSolutionStatus = (solutionId, status, problemId) => {
    if (!solutionId || updatingSolutionId || !adminToken) {
      return;
    }

    setUpdatingSolutionId(solutionId);
    setSolutionsError('');

    resolveAdminToken()
      .then((resolvedToken) =>
        fetch('/api/update-solution-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resolvedToken}`
          },
          body: JSON.stringify({ id: solutionId, status })
        })
      )
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.message || 'Unable to update solution status.');
        }

        return data;
      })
      .then((data) => {
        const updatedSolution = data?.solution;
        if (updatedSolution) {
          setSolutions((currentSolutions) =>
            currentSolutions.map((solution) => (solution.id === updatedSolution.id ? { ...solution, ...updatedSolution } : solution))
          );
        }

        if (status === 'accepted' && problemId) {
          setProblems((currentProblems) =>
            currentProblems.map((problem) =>
              problem.id === problemId
                ? {
                  ...problem,
                  status: 'solved',
                  solution: {
                    solutionId: updatedSolution?.id,
                    summary: updatedSolution?.summary,
                    authorName: updatedSolution?.authorName,
                    updatedAt: updatedSolution?.updatedAt
                  }
                }
                : problem
            )
          );
        }
      })
      .catch((updateError) => {
        setSolutionsError(updateError.message || 'Unable to update solution status.');
      })
      .finally(() => {
        setUpdatingSolutionId('');
      });
  };

  const statusFilteredIdeas = ideas.filter((idea) => {
    const status = (idea.status || 'pending').toLowerCase();
    if (activeAdminSection === 'approved') {
      return status === 'approved';
    }
    if (activeAdminSection === 'rejected') {
      return status === 'rejected';
    }
    return status === 'pending';
  });

  const normalizedSearch = adminSearchQuery.trim().toLowerCase();

  const filteredIdeas = statusFilteredIdeas.filter((idea) => {
    if (!normalizedSearch) {
      return true;
    }

    const searchableText = [
      idea.id,
      idea.title,
      idea.name,
      idea.email,
      idea.domain,
      idea.problem,
      idea.solution
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
  });

  const ideaCounts = ideas.reduce(
    (counts, idea) => {
      const status = (idea.status || 'pending').toLowerCase();
      if (status === 'approved') {
        counts.approved += 1;
      } else if (status === 'rejected') {
        counts.rejected += 1;
      } else {
        counts.pending += 1;
      }
      return counts;
    },
    { pending: 0, approved: 0, rejected: 0 }
  );

  const normalizedProjectSearch = projectSearchQuery.trim().toLowerCase();
  const filteredProjects = projects.filter((project) => {
    if (!normalizedProjectSearch) {
      return true;
    }

    const searchableText = [
      project.id,
      project.name,
      project.category,
      project.team,
      project.description,
      project.externalUrl,
      project.thumbnailUrl,
      project.thumbnail
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedProjectSearch);
  });
  const featuredCount = projects.filter((project) => project.featured === true).length;
  const canSetFeatured = projectForm.featured || featuredCount < MAX_FEATURED_PROJECTS;
  const editingProject = projects.find((project) => project.id === editingProjectId);

  const normalizedProblemSearch = problemSearchQuery.trim().toLowerCase();
  const filteredProblems = problems.filter((problem) => {
    if (!normalizedProblemSearch) {
      return true;
    }

    const searchableText = [
      problem.id,
      problem.title,
      problem.domain,
      problem.difficulty,
      problem.name,
      problem.email,
      problem.status,
      problem.description,
      problem.outcome
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedProblemSearch);
  });

  const solutionsByProblemId = useMemo(() => {
    return solutions.reduce((accumulator, solution) => {
      const key = String(solution.problemId || '').trim();
      if (!key) {
        return accumulator;
      }

      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(solution);
      return accumulator;
    }, {});
  }, [solutions]);

  const selectedAdminProblemSolutions = useMemo(() => {
    const problemId = selectedProblemForSolutions?.id;
    if (!problemId) {
      return [];
    }
    return solutionsByProblemId[problemId] || [];
  }, [selectedProblemForSolutions, solutionsByProblemId]);

  const closeAdminSolutionsModal = () => {
    setIsAdminSolutionsModalOpen(false);
    setSelectedProblemForSolutions(null);
  };

  const openAdminSolutionsModal = (problem) => {
    if (!problem) {
      return;
    }
    setSelectedProblemForSolutions(problem);
    setIsAdminSolutionsModalOpen(true);
  };

  useEffect(() => {
    if (!isAdminSolutionsModalOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeAdminSolutionsModal();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isAdminSolutionsModalOpen]);

  return (
    <>
      <header className="page-header admin-page-header">
        <div className="container">
          <h1>Submitted Ideas</h1>
          <p>Review the latest student idea pitches and their current status.</p>
        </div>
      </header>

      <main className="admin-main">
        <div className="container">
          {!isAuthorized ? (
            <div className="admin-auth-card">
              <h2>Admin Access</h2>
              <p>Sign in with your Firebase admin account to manage idea submissions and project cards.</p>

              {authError ? <div className="submission-banner submission-banner--error">{authError}</div> : null}

              <form
                className="admin-auth-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!firebaseAuth) {
                    setAuthError(firebaseConfigError || 'Firebase admin auth is not configured.');
                    return;
                  }
                  if (!adminEmail || !adminPassword) {
                    setAuthError('Email and password are required.');
                    return;
                  }

                  setIsAuthorizing(true);
                  setAuthError('');

                  try {
                    await signInWithEmailAndPassword(firebaseAuth, adminEmail.trim(), adminPassword);
                    setAdminPassword('');
                  } catch (loginError) {
                    setAuthError(loginError.message || 'Unable to sign in.');
                  } finally {
                    setIsAuthorizing(false);
                  }
                }}
              >
                <label className="form-label" htmlFor="adminEmail">
                  Admin Email
                </label>
                <input
                  id="adminEmail"
                  type="email"
                  className="form-control"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  autoComplete="username"
                  required
                />
                <label className="form-label" htmlFor="adminPassword">
                  Password
                </label>
                <input
                  id="adminPassword"
                  type="password"
                  className="form-control"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button type="submit" className="submit-btn" disabled={isAuthorizing}>
                  {isAuthorizing ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          ) : null}

          {isAuthorized ? (
            <div className="admin-auth-actions">
              <button
                type="button"
                className="admin-signout-btn"
                onClick={() => {
                  if (firebaseAuth) {
                    signOut(firebaseAuth);
                  }
                }}
              >
                Sign out
              </button>
            </div>
          ) : null}

          {isAuthorized && loading ? <div className="admin-state">Loading ideas...</div> : null}
          {isAuthorized && error ? <div className="submission-banner submission-banner--error admin-state">{error}</div> : null}

          {isAuthorized && !loading && !error ? (
            <div className="apply-section-tabs" role="tablist" aria-label="Admin management sections">
              {managementSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={activeManagementSection === section.id}
                  className={`apply-section-tab${activeManagementSection === section.id ? ' active' : ''}`}
                  onClick={() => setActiveManagementSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </div>
          ) : null}

          {isAuthorized && activeManagementSection === 'ideas' && !loading && !error ? (
            <>
              <div className="apply-section-tabs" role="tablist" aria-label="Idea status sections">
                {ideaStatusSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    role="tab"
                    aria-selected={activeAdminSection === section.id}
                    className={`apply-section-tab${activeAdminSection === section.id ? ' active' : ''}`}
                    onClick={() => setActiveAdminSection(section.id)}
                  >
                    {section.label} ({ideaCounts[section.id] || 0})
                  </button>
                ))}
              </div>

              <div className="admin-ideas-toolbar">
                <input
                  type="search"
                  className="form-control admin-search-input"
                  placeholder="Search requests by ID, title, name, domain, problem, or solution"
                  value={adminSearchQuery}
                  onChange={(event) => setAdminSearchQuery(event.target.value)}
                  aria-label="Search project requests"
                />
              </div>
            </>
          ) : null}

          {isAuthorized && activeManagementSection === 'ideas' && !loading && !error && filteredIdeas.length === 0 ? (
            <div className="admin-state">
              {normalizedSearch
                ? `No ${activeAdminSection} ideas match "${adminSearchQuery}".`
                : `No ${activeAdminSection} ideas found.`}
            </div>
          ) : null}

          {isAuthorized && activeManagementSection === 'ideas' && !loading && !error && filteredIdeas.length > 0 ? (
            <div className="admin-ideas-grid">
              {filteredIdeas.map((idea) => (
                <article key={idea.id} className="admin-idea-card">
                  <div className="admin-idea-card-header">
                    <div>
                      <span className={`admin-status admin-status--${idea.status || 'pending'}`}>
                        {idea.status || 'pending'}
                      </span>
                      <h2>{idea.title}</h2>
                    </div>
                    <span className="admin-idea-id">{idea.id}</span>
                  </div>

                  <div className="admin-idea-meta">
                    <p><strong>Name:</strong> {idea.name}</p>
                    <p><strong>Email:</strong> {idea.email}</p>
                    <p><strong>Domain:</strong> {idea.domain}</p>
                    <p><strong>Submitted:</strong> {idea.submittedAt ? new Date(idea.submittedAt).toLocaleString() : 'N/A'}</p>
                  </div>

                  <div className="admin-idea-copy">
                    <p><strong>Problem</strong></p>
                    <p>{idea.problem}</p>
                  </div>

                  <div className="admin-idea-copy">
                    <p><strong>Solution</strong></p>
                    <p>{idea.solution}</p>
                  </div>

                  {(idea.status || 'pending').toLowerCase() === 'pending' ? (
                    <div className="admin-idea-actions">
                      <button
                        type="button"
                        className="admin-action-btn admin-action-btn--approve"
                        disabled={updatingIdeaId === idea.id}
                        onClick={() => updateIdeaStatus(idea.id, 'approved')}
                      >
                        {updatingIdeaId === idea.id ? 'Updating...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        className="admin-action-btn admin-action-btn--reject"
                        disabled={updatingIdeaId === idea.id}
                        onClick={() => updateIdeaStatus(idea.id, 'rejected')}
                      >
                        {updatingIdeaId === idea.id ? 'Updating...' : 'Reject'}
                      </button>
                    </div>
                  ) : (
                    <div className="admin-state">This idea has already been {(idea.status || 'reviewed').toLowerCase()}.</div>
                  )}
                </article>
              ))}
            </div>
          ) : null}

          {isAuthorized && activeManagementSection === 'projects' ? (
            <section className="admin-projects-wrap">
              <div ref={projectEditorRef} className="admin-auth-card admin-project-editor">
                <h2>{editingProjectId ? 'Edit Project Card' : 'Add New Project Card'}</h2>
                <p>These cards appear on the home Projects section and the All Projects page.</p>

                {editingProjectId ? (
                  <div className="submission-banner submission-banner--success" role="status">
                    You are editing <strong>{editingProject?.name || editingProjectId}</strong>. Make changes below and click Save Changes.
                  </div>
                ) : null}

                {projectError ? <div className="submission-banner submission-banner--error">{projectError}</div> : null}

                <form className="admin-auth-form" onSubmit={saveProject}>
                  <label className="form-label" htmlFor="projectCardName">Project Name</label>
                  <input
                    id="projectCardName"
                    type="text"
                    className="form-control"
                    value={projectForm.name}
                    onChange={(event) => updateProjectFormField('name', event.target.value)}
                    required
                  />

                  <label className="form-label" htmlFor="projectCardCategory">Category</label>
                  <input
                    id="projectCardCategory"
                    type="text"
                    className="form-control"
                    value={projectForm.category}
                    onChange={(event) => updateProjectFormField('category', event.target.value)}
                    placeholder="Example: Education, Sustainability"
                    required
                  />

                  <label className="form-label" htmlFor="projectCardTeam">Team</label>
                  <input
                    id="projectCardTeam"
                    type="text"
                    className="form-control"
                    value={projectForm.team}
                    onChange={(event) => updateProjectFormField('team', event.target.value)}
                    required
                  />

                  <label className="form-label" htmlFor="projectCardDescription">Description</label>
                  <textarea
                    id="projectCardDescription"
                    className="form-control"
                    value={projectForm.description}
                    onChange={(event) => updateProjectFormField('description', event.target.value)}
                    minLength={20}
                    required
                  ></textarea>

                  <label className="form-label" htmlFor="projectCardThumbnail">Project Thumbnail URL (optional)</label>
                  <input
                    id="projectCardThumbnail"
                    type="url"
                    className="form-control"
                    value={projectForm.thumbnailUrl}
                    onChange={(event) => updateProjectFormField('thumbnailUrl', event.target.value)}
                    placeholder="https://example.com/project-thumbnail.jpg"
                  />
                  <p className="proposal-hint">Use a direct image URL. If empty, the card will use a default gradient.</p>

                  <label className="form-label" htmlFor="projectCardThumbnailUpload">Upload Thumbnail (optional)</label>
                  <input
                    id="projectCardThumbnailUpload"
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={handleProjectThumbnailUpload}
                  />
                  <p className="proposal-hint">{thumbnailUploadLabel}</p>
                  {projectForm.thumbnailUrl ? (
                    <img src={projectForm.thumbnailUrl} alt="Thumbnail preview" className="admin-project-thumb" />
                  ) : null}

                  <label className="form-label" htmlFor="projectCardExternalUrl">External URL (optional)</label>
                  <input
                    id="projectCardExternalUrl"
                    type="url"
                    className="form-control"
                    value={projectForm.externalUrl}
                    onChange={(event) => updateProjectFormField('externalUrl', event.target.value)}
                    placeholder="https://example.org"
                  />

                  <label className="form-label" htmlFor="projectCardExternalLabel">External Label (optional)</label>
                  <input
                    id="projectCardExternalLabel"
                    type="text"
                    className="form-control"
                    value={projectForm.externalLabel}
                    onChange={(event) => updateProjectFormField('externalLabel', event.target.value)}
                    placeholder="Visit Website"
                  />

                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={projectForm.featured}
                      disabled={!canSetFeatured}
                      onChange={(event) => updateProjectFormField('featured', event.target.checked)}
                    />
                    Show on Home Page (Featured)
                  </label>
                  <p className="proposal-hint">Maximum 3 featured projects can be shown on Home page at a time. Current featured: {featuredCount}/3.</p>
                  {!canSetFeatured ? <p className="proposal-hint">To feature this project, first unfeature one of the existing featured projects.</p> : null}

                  <div className="admin-project-actions">
                    <button type="submit" className="submit-btn" disabled={savingProject}>
                      {savingProject
                        ? editingProjectId
                          ? 'Saving...'
                          : 'Adding...'
                        : editingProjectId
                          ? 'Save Changes'
                          : 'Add Project'}
                    </button>
                    {editingProjectId ? (
                      <button type="button" className="admin-signout-btn" onClick={resetProjectForm}>
                        Cancel Edit
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>

              <div className="admin-ideas-toolbar">
                <input
                  type="search"
                  className="form-control admin-search-input"
                  placeholder="Search project cards by name, category, team, or description"
                  value={projectSearchQuery}
                  onChange={(event) => setProjectSearchQuery(event.target.value)}
                  aria-label="Search project cards"
                />
              </div>

              {projectsLoading ? <div className="admin-state">Loading project cards...</div> : null}
              {!projectsLoading && projectError ? <div className="submission-banner submission-banner--error admin-state">{projectError}</div> : null}

              {!projectsLoading && !projectError && filteredProjects.length === 0 ? (
                <div className="admin-state">
                  {normalizedProjectSearch
                    ? `No projects match "${projectSearchQuery}".`
                    : 'No project cards found.'}
                </div>
              ) : null}

              {!projectsLoading && !projectError && filteredProjects.length > 0 ? (
                <div className="admin-ideas-grid">
                  {filteredProjects.map((project) => (
                    <article
                      key={project.id}
                      className={`admin-idea-card${editingProjectId === project.id ? ' admin-idea-card--editing' : ''}`}
                    >
                      <div className="admin-idea-card-header">
                        <div>
                          <span className={`admin-status ${project.featured ? 'admin-status--approved' : 'admin-status--open'}`}>
                            {project.featured ? 'featured' : 'standard'}
                          </span>
                          <h2>{project.name}</h2>
                        </div>
                        <span className="admin-idea-id">{project.id}</span>
                      </div>

                      <div className="admin-idea-meta">
                        <p><strong>Category:</strong> {project.category}</p>
                        <p><strong>Team:</strong> {project.team}</p>
                        <p><strong>Updated:</strong> {project.updatedAt ? new Date(project.updatedAt).toLocaleString() : 'N/A'}</p>
                        {project.externalUrl ? <p><strong>External URL:</strong> {project.externalUrl}</p> : null}
                      </div>

                      <div className="admin-idea-copy">
                        <p><strong>Description</strong></p>
                        <p>{project.description}</p>
                      </div>

                      <div className="admin-idea-copy">
                        {project.thumbnailUrl || project.thumbnail ? (
                          <img
                            src={project.thumbnailUrl || project.thumbnail}
                            alt={`${project.name} thumbnail`}
                            className="admin-project-thumb"
                          />
                        ) : (
                          <p>No thumbnail added. Default gradient will be used.</p>
                        )}
                      </div>

                      <div className="admin-idea-actions">
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--approve"
                          onClick={() => startProjectEdit(project)}
                          disabled={deletingProjectId === project.id}
                        >
                          {editingProjectId === project.id ? 'Editing...' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--reject"
                          onClick={() => removeProject(project.id)}
                          disabled={deletingProjectId === project.id}
                        >
                          {deletingProjectId === project.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {isAuthorized && activeManagementSection === 'problems' ? (
            <section className="admin-projects-wrap">
              <div className="admin-ideas-toolbar">
                <input
                  type="search"
                  className="form-control admin-search-input"
                  placeholder="Search problems by title, domain, status, or description"
                  value={problemSearchQuery}
                  onChange={(event) => setProblemSearchQuery(event.target.value)}
                  aria-label="Search problem statements"
                />
              </div>

              {problemsLoading ? <div className="admin-state">Loading problems...</div> : null}
              {!problemsLoading && problemsError ? <div className="submission-banner submission-banner--error admin-state">{problemsError}</div> : null}
              {solutionsLoading ? <div className="admin-state">Loading submitted solutions...</div> : null}
              {!solutionsLoading && solutionsError ? <div className="submission-banner submission-banner--error admin-state">{solutionsError}</div> : null}

              {!problemsLoading && !problemsError && filteredProblems.length === 0 ? (
                <div className="admin-state">
                  {normalizedProblemSearch ? `No problems match "${problemSearchQuery}".` : 'No problem statements found.'}
                </div>
              ) : null}

              {!problemsLoading && !problemsError && filteredProblems.length > 0 ? (
                <div className="admin-ideas-grid">
                  {filteredProblems.map((problem) => (
                    <article key={problem.id} className="admin-idea-card">
                      {(() => {
                        const relatedSolutions = solutionsByProblemId[problem.id] || [];
                        return (
                          <>
                      <div className="admin-idea-card-header">
                        <div>
                          <span className={`admin-status admin-status--${problem.status || 'open'}`}>
                            {problem.status || 'open'}
                          </span>
                          <h2>{problem.title}</h2>
                        </div>
                        <span className="admin-idea-id">{problem.id}</span>
                      </div>

                      <div className="admin-idea-meta">
                        <p><strong>Submitted by:</strong> {problem.name || 'N/A'} ({problem.email || 'N/A'})</p>
                        <p><strong>Domain:</strong> {problem.domain || 'General'}</p>
                        <p><strong>Difficulty:</strong> {problem.difficulty || 'N/A'}</p>
                        <p><strong>Deadline:</strong> {problem.deadline ? new Date(problem.deadline).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>Solutions:</strong> {problem.solutionCount || 0}</p>
                      </div>

                      <div className="admin-idea-copy">
                        <p><strong>Description</strong></p>
                        <p>{problem.description}</p>
                      </div>

                      <div className="admin-idea-copy">
                        <p><strong>Expected Outcome</strong></p>
                        <p>{problem.outcome}</p>
                      </div>

                      <div className="admin-idea-copy">
                        <p><strong>Submitted Solutions ({relatedSolutions.length})</strong></p>
                        {relatedSolutions.length === 0 ? <p>No solutions submitted yet for this problem.</p> : null}
                        {relatedSolutions.length > 0 ? (
                          <button
                            type="button"
                            className="admin-action-btn admin-solutions-trigger"
                            onClick={() => openAdminSolutionsModal(problem)}
                          >
                            View Submissions
                          </button>
                        ) : null}
                      </div>

                      <div className="admin-idea-actions">
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--approve"
                          disabled={updatingProblemId === problem.id}
                          onClick={() => updateAdminProblemStatus(problem.id, 'active')}
                        >
                          {updatingProblemId === problem.id ? 'Updating...' : 'Mark In Progress'}
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn"
                          disabled={updatingProblemId === problem.id}
                          onClick={() => updateAdminProblemStatus(problem.id, 'open')}
                        >
                          Reopen
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--approve"
                          disabled={updatingProblemId === problem.id}
                          onClick={() => updateAdminProblemStatus(problem.id, 'solved')}
                        >
                          Mark Solved
                        </button>
                      </div>
                          </>
                        );
                      })()}
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {isAuthorized && isAdminSolutionsModalOpen && selectedProblemForSolutions ? (
            <div className="solution-modal-overlay" role="presentation" onClick={closeAdminSolutionsModal}>
              <section className="admin-solutions-modal" role="dialog" aria-modal="true" aria-label="Submitted solutions" onClick={(event) => event.stopPropagation()}>
                <header className="admin-solutions-modal-head">
                  <div>
                    <h3>Submitted Solutions</h3>
                    <p>
                      {selectedProblemForSolutions.title} ({selectedAdminProblemSolutions.length})
                    </p>
                  </div>
                  <button
                    type="button"
                    className="solution-modal-close"
                    onClick={closeAdminSolutionsModal}
                    aria-label="Close submitted solutions"
                  >
                    ×
                  </button>
                </header>

                {selectedAdminProblemSolutions.length === 0 ? (
                  <p className="admin-solutions-empty">No submissions available.</p>
                ) : (
                  <div className="solutions-list admin-solutions-list">
                    {selectedAdminProblemSolutions.map((solution) => {
                      const reviewStatus = solution.status || 'submitted';

                      return (
                        <article key={solution.id} className="solution-card admin-solution-card">
                          <header className="solution-card-head">
                            <div>
                              <h4>{solution.title || 'Untitled solution'}</h4>
                              <p>
                                {solution.authorName || 'Unknown'} ({solution.authorEmail || 'N/A'})
                              </p>
                            </div>
                            <span className={`solution-status solution-status--${reviewStatus}`}>
                              {reviewStatus.replace(/_/g, ' ')}
                            </span>
                          </header>

                          {solution.summary ? <p>{solution.summary}</p> : null}
                          {solution.details ? <p>{solution.details}</p> : null}
                          {solution.archiveUploadWarning ? (
                            <p className="admin-solutions-empty">ZIP upload error: {solution.archiveUploadWarning}</p>
                          ) : null}

                          <div className="solution-links">
                            {solution.repoUrl ? (
                              <a href={solution.repoUrl} target="_blank" rel="noreferrer">Repository</a>
                            ) : null}
                            {solution.demoUrl ? (
                              <a href={solution.demoUrl} target="_blank" rel="noreferrer">Live Demo</a>
                            ) : null}
                            {solution.codeArchiveUrl ? (
                              <a href={solution.codeArchiveUrl} target="_blank" rel="noreferrer">
                                {solution.codeArchiveName ? `ZIP: ${solution.codeArchiveName}` : 'Download ZIP'}
                              </a>
                            ) : (
                              <span className="admin-solutions-empty">No ZIP uploaded</span>
                            )}
                          </div>

                          <div className="admin-idea-actions">
                            <button
                              type="button"
                              className="admin-action-btn"
                              disabled={updatingSolutionId === solution.id || reviewStatus === 'under_review'}
                              onClick={() => updateAdminSolutionStatus(solution.id, 'under_review', selectedProblemForSolutions.id)}
                            >
                              {updatingSolutionId === solution.id ? 'Updating...' : 'Under Review'}
                            </button>
                            <button
                              type="button"
                              className="admin-action-btn"
                              disabled={updatingSolutionId === solution.id || reviewStatus === 'shortlisted'}
                              onClick={() => updateAdminSolutionStatus(solution.id, 'shortlisted', selectedProblemForSolutions.id)}
                            >
                              Shortlist
                            </button>
                            <button
                              type="button"
                              className="admin-action-btn admin-action-btn--approve"
                              disabled={updatingSolutionId === solution.id || reviewStatus === 'accepted'}
                              onClick={() => updateAdminSolutionStatus(solution.id, 'accepted', selectedProblemForSolutions.id)}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="admin-action-btn admin-action-btn--reject"
                              disabled={updatingSolutionId === solution.id || reviewStatus === 'rejected'}
                              onClick={() => updateAdminSolutionStatus(solution.id, 'rejected', selectedProblemForSolutions.id)}
                            >
                              Reject
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}

export default App;

