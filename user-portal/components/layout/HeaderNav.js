import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Shield,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  Bot,
  Workflow,
  Database,
  Cpu,
  Code2,
  Building2,
  HeartPulse,
  ShieldCheck,
  FileCheck,
  Terminal,
  Package,
  Webhook,
  Boxes,
  BookOpen,
  FileText,
  TrendingUp,
  Lock,
  Building,
  Mail,
  Sparkles,
  Scale,
  Rocket,
  Briefcase,
  Layers,
} from 'lucide-react';
import { NAV_ITEMS } from './NavDropdownData';

// Map icon strings to Lucide components
const ICON_MAP = {
  Bot,
  Workflow,
  Database,
  Cpu,
  Code2,
  Building2,
  HeartPulse,
  ShieldCheck,
  FileCheck,
  Terminal,
  Package,
  Webhook,
  Boxes,
  BookOpen,
  FileText,
  TrendingUp,
  Lock,
  Building,
  Mail,
  Sparkles,
  Scale,
  Rocket,
  Briefcase,
  Layers,
};

export default function HeaderNav({ activePath = '' }) {
  const router = useRouter();
  const currentPath = activePath || router.asPath || '/';

  // Desktop active dropdown state (hover or click)
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownTimeoutRef = useRef(null);

  // Mobile drawer state & refs for focus management
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState(null);
  const menuButtonRef = useRef(null);
  const drawerCloseBtnRef = useRef(null);
  const prevMobileMenuOpen = useRef(false);

  // Handle outside click to dismiss dropdown & Escape key for keyboard a11y
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.nav-menu-item-wrapper')) {
        setActiveDropdown(null);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // Prevent background scroll and manage accessible focus when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      // Focus on the close button in the drawer when opened
      setTimeout(() => {
        drawerCloseBtnRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = '';
      // Return focus to menu toggle button when drawer closes
      if (prevMobileMenuOpen.current) {
        menuButtonRef.current?.focus();
      }
    }
    prevMobileMenuOpen.current = mobileMenuOpen;
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Handle desktop mouse enter / leave with small grace timeout
  const handleMouseEnter = (itemId) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(itemId);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 140);
  };

  const toggleDropdown = (itemId, e) => {
    e.preventDefault();
    setActiveDropdown((prev) => (prev === itemId ? null : itemId));
  };

  const toggleMobileCategory = (itemId) => {
    setExpandedMobileCategory((prev) => (prev === itemId ? null : itemId));
  };

  const renderIcon = (iconName) => {
    const IconComponent = ICON_MAP[iconName] || Bot;
    return <IconComponent className="dropdown-item-icon" size={18} />;
  };

  return (
    <>
      <header className="global-header">
        <div className="header-container">
          {/* Brand Logo */}
          <Link href="/" className="logo-container" onClick={() => setActiveDropdown(null)} aria-label="Xarwiz Home">
            <img src="/assets/xarwiz-logo.png" alt="Xarwiz" className="brand-logo-img" />
            <span className="logo-badge">
              <Shield style={{ width: 12, height: 12 }} /> AI Cloud Platform
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="desktop-nav" aria-label="Main Navigation">
            <ul className="nav-menu">
              {NAV_ITEMS.map((item) => {
                const isOpen = activeDropdown === item.id;
                const isCurrent =
                  (item.href !== '/' && currentPath.startsWith(item.href)) ||
                  (item.columns &&
                    item.columns.some((col) =>
                      col.items.some(
                        (sub) => sub.href !== '/' && !sub.href.startsWith('/#') && currentPath.startsWith(sub.href)
                      )
                    ));

                if (!item.hasDropdown) {
                  return (
                    <li key={item.id} className="nav-menu-item-wrapper">
                      <Link
                        href={item.href}
                        className={`nav-link-btn ${isCurrent ? 'active' : ''}`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                }

                return (
                  <li
                    key={item.id}
                    className="nav-menu-item-wrapper"
                    onMouseEnter={() => handleMouseEnter(item.id)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      type="button"
                      className={`nav-link-btn ${isOpen ? 'open' : ''} ${isCurrent ? 'active' : ''}`}
                      onClick={(e) => toggleDropdown(item.id, e)}
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                      aria-controls={`mega-menu-${item.id}`}
                    >
                      <span>{item.label}</span>
                      <ChevronDown
                        className={`nav-chevron ${isOpen ? 'rotated' : ''}`}
                        size={14}
                      />
                    </button>

                    {/* Mega-Menu Dropdown Card */}
                    {isOpen && (
                      <div
                        id={`mega-menu-${item.id}`}
                        className="mega-menu-flyout"
                        role="region"
                        aria-label={`${item.label} sub-menu`}
                      >
                        <div className="mega-menu-inner">
                          {item.columns.map((col, colIdx) => (
                            <div key={colIdx} className="mega-menu-col">
                              {col.sectionTitle && (
                                <div className="mega-menu-section-header">
                                  {col.sectionTitle}
                                </div>
                              )}
                              <div className="mega-menu-items-grid">
                                {col.items.map((subItem, sIdx) => (
                                  <Link
                                    key={sIdx}
                                    href={subItem.href}
                                    className="mega-menu-item-link"
                                    onClick={() => setActiveDropdown(null)}
                                  >
                                    <div className="icon-wrapper">
                                      {renderIcon(subItem.icon)}
                                    </div>
                                    <div className="item-text-wrapper">
                                      <div className="item-title-row">
                                        <span className="item-title">{subItem.title}</span>
                                        {subItem.badge && (
                                          <span className="item-badge">{subItem.badge}</span>
                                        )}
                                      </div>
                                      <p className="item-desc">{subItem.desc}</p>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Desktop Call to Actions */}
          <div className="header-ctas desktop-ctas">
            <Link href="/signup?source=book_demo" className="btn-demo">
              Book a Demo
            </Link>
            <Link href="/signup" className="btn-trial">
              Request Access
            </Link>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            ref={menuButtonRef}
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer & Backdrop */}
        {mobileMenuOpen && (
          <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
            <div
              id="mobile-navigation-drawer"
              className="mobile-drawer-content"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation drawer"
            >
              <div className="mobile-drawer-header">
                <Link href="/" className="logo-container" onClick={() => setMobileMenuOpen(false)} aria-label="Xarwiz Home">
                  <img src="/assets/xarwiz-logo.png" alt="Xarwiz" className="brand-logo-img" />
                </Link>
                <button
                  ref={drawerCloseBtnRef}
                  type="button"
                  className="mobile-drawer-close"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>

              <nav className="mobile-drawer-nav" aria-label="Mobile Navigation">
                <ul className="mobile-nav-list">
                  {NAV_ITEMS.map((item) => {
                    if (!item.hasDropdown) {
                      return (
                        <li key={item.id} className="mobile-nav-item">
                          <Link
                            href={item.href}
                            className="mobile-link"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    }

                    const isExpanded = expandedMobileCategory === item.id;

                    return (
                      <li key={item.id} className="mobile-nav-item accordion">
                        <button
                          type="button"
                          className="mobile-accordion-toggle"
                          onClick={() => toggleMobileCategory(item.id)}
                          aria-expanded={isExpanded}
                          aria-controls={`mobile-sublinks-${item.id}`}
                        >
                          <span>{item.label}</span>
                          <ChevronDown
                            className={`mobile-chevron ${isExpanded ? 'rotated' : ''}`}
                            size={16}
                          />
                        </button>

                        {isExpanded && (
                          <div id={`mobile-sublinks-${item.id}`} className="mobile-sublinks-box">
                            {item.columns.map((col, cIdx) => (
                              <div key={cIdx} className="mobile-subcol">
                                {col.items.map((sub, sIdx) => (
                                  <Link
                                    key={sIdx}
                                    href={sub.href}
                                    className="mobile-sublink"
                                    onClick={() => setMobileMenuOpen(false)}
                                  >
                                    <div className="mobile-sublink-icon">
                                      {renderIcon(sub.icon)}
                                    </div>
                                    <div className="mobile-sublink-content">
                                      <div className="mobile-sublink-title">
                                        {sub.title}
                                        {sub.badge && (
                                          <span className="mobile-sublink-badge">{sub.badge}</span>
                                        )}
                                      </div>
                                      <div className="mobile-sublink-desc">{sub.desc}</div>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="mobile-drawer-ctas">
                <Link
                  href="/signup"
                  className="btn-mobile-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Request Access <ArrowRight size={16} />
                </Link>
                <Link
                  href="/signup?source=book_demo"
                  className="btn-mobile-secondary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Book a Demo
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Embedded High-Performance Scoped Styles */}
      <style jsx>{`
        .global-header {
          position: sticky;
          top: 0;
          z-index: 999;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 0;
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .header-container {
          max-width: 1360px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .brand-logo-img {
          height: 32px;
          width: auto;
          display: block;
        }

        .logo-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 20px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          font-size: 0.72rem;
          font-weight: 600;
          color: #2563eb;
        }

        /* Desktop Nav */
        .desktop-nav {
          display: flex;
          align-items: center;
        }

        .nav-menu {
          display: flex;
          align-items: center;
          gap: 8px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .nav-menu-item-wrapper {
          position: relative;
        }

        .nav-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.92rem;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          text-decoration: none;
          transition: color 0.15s ease, background 0.15s ease;
        }

        .nav-link-btn:hover,
        .nav-link-btn.open {
          color: #2563eb;
          background: #f1f5f9;
        }

        .nav-link-btn.active {
          color: #2563eb;
          font-weight: 600;
        }

        .nav-chevron {
          transition: transform 0.2s ease;
          color: #94a3b8;
        }

        .nav-chevron.rotated {
          transform: rotate(180deg);
          color: #2563eb;
        }

        /* Desktop Mega-Menu Flyout */
        .mega-menu-flyout {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          width: 480px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.03);
          padding: 16px;
          z-index: 1000;
          animation: flyoutSlideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes flyoutSlideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -6px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .mega-menu-section-header {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          padding: 4px 12px 8px;
        }

        .mega-menu-items-grid {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .mega-menu-item-link {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          text-decoration: none;
          transition: background 0.15s ease;
        }

        .mega-menu-item-link:hover {
          background: #f8fafc;
        }

        .icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.15s ease, background 0.15s ease;
        }

        .mega-menu-item-link:hover .icon-wrapper {
          background: #dbeafe;
          transform: scale(1.05);
        }

        .item-text-wrapper {
          flex: 1;
        }

        .item-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 2px;
        }

        .item-title {
          font-size: 0.88rem;
          font-weight: 600;
          color: #0f172a;
        }

        .item-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 10px;
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
          line-height: 1;
        }

        .item-desc {
          margin: 0;
          font-size: 0.78rem;
          color: #64748b;
          line-height: 1.4;
        }

        /* Desktop CTAs */
        .header-ctas {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-demo {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 600;
          color: #0f172a;
          text-decoration: none;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
        }

        .btn-demo:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .btn-trial {
          background: #2563eb;
          border: none;
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 600;
          color: #ffffff;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
          transition: all 0.2s ease;
        }

        .btn-trial:hover {
          background: #1d4ed8;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
        }

        /* Mobile Menu Toggle */
        .mobile-menu-btn {
          display: none;
          background: transparent;
          border: none;
          color: #0f172a;
          cursor: pointer;
          padding: 6px;
        }

        /* Mobile Drawer */
        .mobile-drawer-overlay {
          display: none;
        }

        /* Accessibility Focus Indicators */
        button:focus-visible,
        a:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .global-header,
          .mega-menu-flyout,
          .mobile-drawer-content,
          .nav-chevron,
          .mobile-chevron,
          .btn-demo,
          .btn-trial {
            animation: none !important;
            transition: none !important;
          }
        }

        @media (max-width: 992px) {
          .desktop-nav,
          .desktop-ctas {
            display: none;
          }

          .mobile-menu-btn {
            display: block;
          }

          .mobile-drawer-overlay {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(4px);
            z-index: 10000;
          }

          .mobile-drawer-content {
            position: absolute;
            top: 0;
            right: 0;
            width: 85%;
            max-width: 380px;
            height: 100%;
            background: #ffffff;
            box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            animation: slideInRight 0.22s ease-out;
          }

          @keyframes slideInRight {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }

          .mobile-drawer-header {
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #f1f5f9;
          }

          .mobile-drawer-close {
            background: transparent;
            border: none;
            color: #64748b;
            cursor: pointer;
            padding: 4px;
          }

          .mobile-drawer-nav {
            flex: 1;
            padding: 16px 20px;
          }

          .mobile-nav-list {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .mobile-link {
            display: block;
            padding: 10px 12px;
            font-size: 0.95rem;
            font-weight: 600;
            color: #1e293b;
            text-decoration: none;
            border-radius: 8px;
          }

          .mobile-accordion-toggle {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            font-size: 0.95rem;
            font-weight: 600;
            color: #1e293b;
            background: transparent;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            text-align: left;
          }

          .mobile-accordion-toggle:hover {
            background: #f8fafc;
          }

          .mobile-chevron {
            color: #94a3b8;
            transition: transform 0.2s ease;
          }

          .mobile-chevron.rotated {
            transform: rotate(180deg);
            color: #2563eb;
          }

          .mobile-sublinks-box {
            padding: 6px 8px 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .mobile-sublink {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 8px 10px;
            border-radius: 8px;
            text-decoration: none;
            background: #f8fafc;
          }

          .mobile-sublink-icon {
            color: #2563eb;
            margin-top: 2px;
          }

          .mobile-sublink-title {
            font-size: 0.85rem;
            font-weight: 600;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .mobile-sublink-badge {
            font-size: 0.6rem;
            font-weight: 700;
            padding: 2px 5px;
            border-radius: 6px;
            background: #f0fdf4;
            color: #16a34a;
          }

          .mobile-sublink-desc {
            font-size: 0.72rem;
            color: #64748b;
            line-height: 1.3;
            margin-top: 2px;
          }

          .mobile-drawer-ctas {
            padding: 20px;
            border-top: 1px solid #f1f5f9;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .btn-mobile-primary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: #2563eb;
            color: #ffffff;
            font-weight: 600;
            font-size: 0.95rem;
            padding: 12px;
            border-radius: 10px;
            text-decoration: none;
          }

          .btn-mobile-secondary {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            color: #0f172a;
            font-weight: 600;
            font-size: 0.95rem;
            padding: 12px;
            border-radius: 10px;
            text-decoration: none;
          }
        }
      `}</style>
    </>
  );
}
