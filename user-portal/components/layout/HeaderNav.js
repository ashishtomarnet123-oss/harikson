import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Shield,
  ChevronDown,
  ChevronRight,
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
  Calendar,
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
                                {col.items.map((subItem, sIdx) => {
                                  const badgeClass = subItem.badge
                                    ? `badge-${subItem.badge.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
                                    : '';
                                  return (
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
                                        <span className="item-title">{subItem.title}</span>
                                        {subItem.badge && (
                                          <span className={`item-badge ${badgeClass}`}>{subItem.badge}</span>
                                        )}
                                      </div>
                                      <ChevronRight size={13} className="item-arrow" />
                                    </Link>
                                  );
                                })}
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
            <Link href="/signup" className="btn-trial">
              Request Access
            </Link>
            <Link href="/signup?source=book_live_demo" className="btn-demo">
              Book Live Demo
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
                                {col.items.map((sub, sIdx) => {
                                  const badgeClass = sub.badge
                                    ? `badge-${sub.badge.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
                                    : '';
                                  return (
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
                                        <span className="mobile-sublink-title">{sub.title}</span>
                                        {sub.badge && (
                                          <span className={`mobile-sublink-badge ${badgeClass}`}>{sub.badge}</span>
                                        )}
                                      </div>
                                      <ChevronRight size={14} className="mobile-sublink-arrow" />
                                    </Link>
                                  );
                                })}
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
                  Request Access
                </Link>
                <Link
                  href="/signup?source=book_live_demo"
                  className="btn-mobile-secondary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Book Live Demo
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
          left: 0;
          min-width: 290px;
          max-width: 320px;
          width: max-content;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 14px;
          box-shadow: 0 16px 36px -6px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(15, 23, 42, 0.04);
          padding: 8px;
          z-index: 1000;
          animation: flyoutSlideDown 0.16s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Hover bridge to keep dropdown open smoothly while moving mouse */
        .mega-menu-flyout::before {
          content: '';
          position: absolute;
          top: -10px;
          left: 0;
          right: 0;
          height: 10px;
        }

        @keyframes flyoutSlideDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .mega-menu-section-header {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #94a3b8;
          padding: 6px 10px 6px;
          margin-bottom: 2px;
        }

        .mega-menu-items-grid {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        /* Mega Menu Item Link - Guaranteed zero underlines & full hit target */
        :global(.mega-menu-item-link),
        .mega-menu-item-link {
          display: flex !important;
          align-items: center !important;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 9px;
          text-decoration: none !important;
          color: #0f172a !important;
          background: transparent;
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }

        :global(.mega-menu-item-link:hover),
        .mega-menu-item-link:hover {
          background: #f8fafc !important;
          text-decoration: none !important;
        }

        :global(.mega-menu-item-link *),
        .mega-menu-item-link * {
          text-decoration: none !important;
        }

        .icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }

        :global(.mega-menu-item-link:hover) .icon-wrapper,
        .mega-menu-item-link:hover .icon-wrapper {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #2563eb;
          transform: scale(1.05);
        }

        .item-text-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .item-title {
          font-size: 0.86rem;
          font-weight: 500;
          color: #0f172a;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-decoration: none !important;
          transition: color 0.15s ease;
        }

        :global(.mega-menu-item-link:hover) .item-title,
        .mega-menu-item-link:hover .item-title {
          color: #2563eb;
          font-weight: 600;
        }

        .item-badge {
          font-size: 0.65rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 9999px;
          line-height: 1.2;
          white-space: nowrap;
          letter-spacing: 0.01em;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        :global(.badge-popular),
        .badge-popular {
          background: #ecfdf5 !important;
          color: #059669 !important;
          border: 1px solid #a7f3d0 !important;
        }

        :global(.badge-fast-response),
        .badge-fast-response {
          background: #eff6ff !important;
          color: #2563eb !important;
          border: 1px solid #bfdbfe !important;
        }

        :global(.badge-we-re-hiring),
        .badge-we-re-hiring {
          background: #fdf4ff !important;
          color: #9333ea !important;
          border: 1px solid #f0abfc !important;
        }

        :global(.item-arrow),
        .item-arrow {
          opacity: 0;
          color: #94a3b8;
          flex-shrink: 0;
          transition: all 0.15s ease;
          transform: translateX(-3px);
          margin-left: auto;
        }

        :global(.mega-menu-item-link:hover) :global(.item-arrow),
        .mega-menu-item-link:hover :global(.item-arrow) {
          opacity: 0.85;
          color: #2563eb;
          transform: translateX(0);
        }

        /* Desktop CTAs */
        .header-ctas {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-trial,
        :global(.btn-trial),
        .header-ctas :global(.btn-trial) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #2563eb;
          border: none;
          padding: 10px 22px;
          border-radius: 12px;
          font-size: 0.92rem;
          font-weight: 700;
          color: #ffffff;
          text-decoration: none;
          box-shadow: 0 8px 20px -2px rgba(37, 99, 235, 0.45);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          white-space: nowrap;
        }

        .btn-trial:hover,
        :global(.btn-trial:hover),
        .header-ctas :global(.btn-trial:hover) {
          background: #1d4ed8;
          color: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 10px 24px -2px rgba(37, 99, 235, 0.55);
          text-decoration: none;
        }

        .btn-trial:focus-visible,
        :global(.btn-trial:focus-visible),
        .header-ctas :global(.btn-trial:focus-visible) {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }

        .btn-demo,
        :global(.btn-demo),
        .header-ctas :global(.btn-demo) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 10px 22px;
          border-radius: 12px;
          font-size: 0.92rem;
          font-weight: 700;
          color: #0f172a;
          text-decoration: none;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          white-space: nowrap;
        }

        .btn-demo:hover,
        :global(.btn-demo:hover),
        .header-ctas :global(.btn-demo:hover) {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
          text-decoration: none;
        }

        .btn-demo:focus-visible,
        :global(.btn-demo:focus-visible),
        .header-ctas :global(.btn-demo:focus-visible) {
          outline: 2px solid #0284c7;
          outline-offset: 2px;
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
            padding: 4px 6px 8px 12px;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          :global(.mobile-sublink),
          .mobile-sublink {
            display: flex !important;
            align-items: center !important;
            gap: 10px;
            padding: 8px 10px;
            border-radius: 8px;
            text-decoration: none !important;
            color: #0f172a !important;
            background: #f8fafc;
            transition: all 0.15s ease;
          }

          :global(.mobile-sublink:active),
          .mobile-sublink:active {
            background: #eff6ff !important;
          }

          :global(.mobile-sublink *),
          .mobile-sublink * {
            text-decoration: none !important;
          }

          .mobile-sublink-icon {
            color: #475569;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          :global(.mobile-sublink:hover) .mobile-sublink-icon,
          .mobile-sublink:hover .mobile-sublink-icon {
            color: #2563eb;
          }

          .mobile-sublink-content {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
          }

          .mobile-sublink-title {
            font-size: 0.85rem;
            font-weight: 500;
            color: #0f172a;
            text-decoration: none !important;
          }

          :global(.mobile-sublink:hover) .mobile-sublink-title,
          .mobile-sublink:hover .mobile-sublink-title {
            color: #2563eb;
            font-weight: 600;
          }

          .mobile-sublink-badge {
            font-size: 0.62rem;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 9999px;
            background: #f1f5f9;
            color: #475569;
          }

          :global(.mobile-sublink-arrow),
          .mobile-sublink-arrow {
            color: #cbd5e1;
            flex-shrink: 0;
            margin-left: auto;
          }

          .mobile-drawer-ctas {
            padding: 20px;
            border-top: 1px solid #f1f5f9;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .btn-mobile-primary,
          :global(.btn-mobile-primary),
          .mobile-drawer-ctas :global(.btn-mobile-primary) {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #2563eb;
            color: #ffffff;
            font-weight: 700;
            font-size: 0.95rem;
            padding: 12px;
            border-radius: 12px;
            text-decoration: none;
            box-shadow: 0 8px 20px -2px rgba(37, 99, 235, 0.45);
            transition: all 0.2s ease;
          }

          .btn-mobile-primary:active,
          :global(.btn-mobile-primary:active) {
            transform: scale(0.99);
          }

          .btn-mobile-secondary,
          :global(.btn-mobile-secondary),
          .mobile-drawer-ctas :global(.btn-mobile-secondary) {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            color: #0f172a;
            font-weight: 700;
            font-size: 0.95rem;
            padding: 12px;
            border-radius: 12px;
            text-decoration: none;
            transition: all 0.2s ease;
          }

          .btn-mobile-secondary:active {
            background: #f8fafc;
          }

          .btn-mobile-secondary :global(.cta-icon) {
            color: #64748b;
          }

          .btn-mobile-secondary:active {
            background: #f8fafc;
          }
        }
      `}</style>
    </>
  );
}
