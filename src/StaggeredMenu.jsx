import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './StaggeredMenu.css';

const StaggeredMenu = ({
  position = 'right',
  isFixed = false,
  items = [],
  socialItems = [],
  displaySocials = false,
  displayItemNumbering = false,
  colors = ['#212121', '#414141'],
  accentColor = '#c9f31d',
  menuButtonColor = '#212121',
  openMenuButtonColor,
  changeMenuColorOnOpen = true,
  logoUrl,
  navigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const preLayersRef = useRef([]);
  const preContainerRef = useRef(null);
  const tlRef = useRef(null);

  const offscreen = position === 'left' ? -100 : 100;

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const preLayers = preLayersRef.current.filter(Boolean);
    const preContainer = preContainerRef.current;

    if (!panel) return;

    gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
    if (preContainer) gsap.set(preContainer, { xPercent: 0, opacity: 1 });

    const tl = gsap.timeline({ paused: true });

    tl.to(preLayers, {
      xPercent: 0,
      duration: 0.42,
      stagger: 0.08,
      ease: 'power3.inOut',
    });

    tl.to(
      panel,
      { xPercent: 0, duration: 0.45, ease: 'power3.inOut' },
      '-=0.28'
    );

    tlRef.current = tl;

    return () => { tl.kill(); };
  }, [offscreen]);

  const openMenu = useCallback(() => {
    setIsOpen(true);
    tlRef.current?.play();
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    tlRef.current?.reverse();
  }, []);

  const toggleMenu = useCallback(() => {
    if (isOpen) closeMenu();
    else openMenu();
  }, [isOpen, openMenu, closeMenu]);

  const handleItemClick = useCallback(
    (e, link) => {
      closeMenu();
      if (!link || link === '#') {
        e.preventDefault();
        return;
      }
      if (link.startsWith('/') && navigate) {
        e.preventDefault();
        setTimeout(() => navigate(link), 380);
      }
      // hash links and external links handled by browser normally
    },
    [closeMenu, navigate]
  );

  const btnColor =
    changeMenuColorOnOpen && isOpen && openMenuButtonColor
      ? openMenuButtonColor
      : menuButtonColor;

  const wrapperClass = [
    'staggered-menu-wrapper',
    isFixed ? 'fixed-wrapper' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass} aria-hidden={!isFixed}>
      {/* Stagger pre-layers */}
      <div className="sm-prelayers" ref={preContainerRef}>
        {colors.map((color, i) => (
          <div
            key={i}
            className="sm-prelayer"
            style={{ background: color }}
            ref={(el) => { preLayersRef.current[i] = el; }}
          />
        ))}
      </div>

      {/* Main slide panel */}
      <div className="staggered-menu-panel" ref={panelRef} aria-hidden={!isOpen}>
        <div className="sm-panel-inner">
          {logoUrl && (
            <div className="sm-logo">
              <img src={logoUrl} alt="Logo" />
            </div>
          )}

          <nav className="sm-panel-nav" aria-label="Site navigation">
            <ul
              className={`sm-panel-list${displayItemNumbering ? ' sm-panel-list--numbered' : ''}`}
            >
              {items.map((item, idx) => (
                <li className="sm-panel-itemWrap" key={item.label + idx}>
                  <a
                    className="sm-panel-item"
                    href={item.link || '#'}
                    aria-label={item.ariaLabel || item.label}
                    data-index={String(idx + 1).padStart(2, '0')}
                    onClick={(e) => handleItemClick(e, item.link)}
                    style={{ '--accent': accentColor }}
                  >
                    <span className="sm-panel-itemLabel">{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {displaySocials && socialItems.length > 0 && (
            <div className="sm-socials">
              {socialItems.map((s, i) => (
                <a
                  key={i}
                  className="sm-socials-link"
                  href={s.link || '#'}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ '--accent': accentColor }}
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating header with toggle button */}
      <div className="staggered-menu-header">
        <button
          type="button"
          className={`sm-toggle${isOpen ? ' open' : ''}`}
          aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={isOpen}
          aria-controls="staggered-menu-panel"
          onClick={toggleMenu}
        >
          <span
            className="sm-toggle-icon"
            style={{ '--btn-color': btnColor }}
          >
            <span className="sm-bar sm-bar-1" />
            <span className="sm-bar sm-bar-2" />
            <span className="sm-bar sm-bar-3" />
          </span>
        </button>
      </div>

      {/* Click-away backdrop */}
      {isOpen && (
        <div
          className="sm-backdrop"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default StaggeredMenu;
