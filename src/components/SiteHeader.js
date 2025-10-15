
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function useStableNavItems(items) {
  return useMemo(() => items.map((item) => ({ ...item })), [items]);
}

export default function SiteHeader({ navItems, searchItems }) {
  const stableNavItems = useStableNavItems(navItems);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState(() => stableNavItems[0]?.id ?? '');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchVariant, setActiveSearchVariant] = useState(null);
  const searchContainersRef = useRef({ desktop: null, mobile: null });
  const searchInputsRef = useRef({ desktop: null, mobile: null });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setActiveSection(stableNavItems[0]?.id ?? '');
  }, [stableNavItems]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);

    const observerOptions = {
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    stableNavItems.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [stableNavItems]);

  const handleNavClick = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMenuOpen(false);
    }
  };

  const handleKeyDown = (event, sectionId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavClick(sectionId);
    }
  };

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const handleMenuKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleMenu();
    } else if (event.key === 'Escape' && isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  const derivedSearchItems = useMemo(() => {
    if (searchItems?.length) {
      return searchItems;
    }

    return stableNavItems.map((item) => ({
      id: `section-${item.id}`,
      label: item.label,
      sectionId: item.id,
      href: `/#${item.id}`
    }));
  }, [searchItems, stableNavItems]);

  const filteredSearchItems = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) {
      return derivedSearchItems;
    }

    return derivedSearchItems.filter((item) => {
      const label = item.label?.toLowerCase() ?? '';
      const description = item.description?.toLowerCase() ?? '';
      return label.includes(term) || description.includes(term);
    });
  }, [derivedSearchItems, searchQuery]);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setActiveSearchVariant(null);
  }, []);

  const handleSearchToggle = useCallback(
    (variant) => {
      if (isSearchOpen && activeSearchVariant === variant) {
        closeSearch();
        return;
      }

      setActiveSearchVariant(variant);
      setIsSearchOpen(true);
    },
    [activeSearchVariant, closeSearch, isSearchOpen]
  );

  useEffect(() => {
    if (!isSearchOpen) {
      return undefined;
    }

    const containers = Object.values(searchContainersRef.current).filter(Boolean);

    const handleClickOutside = (event) => {
      if (containers.length === 0) {
        return;
      }

      const isInside = containers.some((container) => container.contains(event.target));
      if (!isInside) {
        closeSearch();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeSearch();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closeSearch, isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen || !activeSearchVariant) {
      return undefined;
    }

    const targetInput = searchInputsRef.current[activeSearchVariant];
    if (targetInput) {
      const timeoutId = window.setTimeout(() => {
        targetInput.focus();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [isSearchOpen, activeSearchVariant]);

  const handleSearchSelect = (item) => {
    closeSearch();
    setIsMenuOpen(false);

    if (item?.href) {
      const [basePath, hash] = item.href.split('#');
      const isAnchor = Boolean(hash);

      if (isAnchor) {
        const normalizedBase = basePath === '' ? '/' : basePath;
        const targetPath = normalizedBase.endsWith('/') ? normalizedBase.slice(0, -1) || '/' : normalizedBase;
        const isCurrentPage = pathname === targetPath;

        if (isCurrentPage) {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        }
      }

      router.push(item.href);
      return;
    }

    if (item?.sectionId) {
      handleNavClick(item.sectionId);
      return;
    }

    if (item?.id) {
      handleNavClick(item.id);
    }
  };

  const renderSearchPanel = (variant) => {
    const isDesktop = variant === 'desktop';
    const iconSize = isDesktop ? 28 : 24;

    return (
      <div
        ref={(node) => {
          searchContainersRef.current[variant] = node;
        }}
        className="relative"
      >
        <button
          type="button"
          onClick={() => handleSearchToggle(variant)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60 ${
            isDesktop ? '' : 'text-white'
          }`}
          aria-expanded={isSearchOpen && activeSearchVariant === variant}
          aria-haspopup="dialog"
        >
          <span
            className={`font-normal ${isDesktop ? 'text-white text-[32px]' : 'text-white text-[20px]'}`}
            style={{ fontFamily: '"Ruigslay"', fontWeight: 400, letterSpacing: '-1.92px', textShadow: isDesktop ? '0 10px 24px rgba(0, 0, 0, 0.28)' : '0 8px 22px rgba(0, 0, 0, 0.22)' }}
          >
            SEARCH
          </span>
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" className="text-white">
            <path
              d="M19.6 21L13.3 14.7C12.8 15.1 12.225 15.4167 11.575 15.65C10.925 15.8833 10.2333 16 9.5 16C7.68333 16 6.14583 15.3708 4.8875 14.1125C3.62917 12.8542 3 11.3167 3 9.5C3 7.68333 3.62917 6.14583 4.8875 4.8875C6.14583 3.62917 7.68333 3 9.5 3C11.3167 3 12.8542 3.62917 14.1125 4.8875C15.3708 6.14583 16 7.68333 16 9.5C16 10.2333 15.8833 10.925 15.65 11.575C15.4167 12.225 15.1 12.8 14.7 13.3L21 19.6L19.6 21ZM9.5 14C10.75 14 11.8125 13.5625 12.6875 12.6875C13.5625 11.8125 14 10.75 14 9.5C14 8.25 13.5625 7.1875 12.6875 6.3125C11.8125 5.4375 10.75 5 9.5 5C8.25 5 7.1875 5.4375 6.3125 6.3125C5.4375 7.1875 5 8.25 5 9.5C5 10.75 5.4375 11.8125 6.3125 12.6875C7.1875 13.5625 8.25 14 9.5 14Z"
              fill="currentColor"
            />
          </svg>
        </button>

        {isSearchOpen && activeSearchVariant === variant && (
          <div
            className={`absolute right-0 z-50 mt-3 rounded-2xl border border-emerald-900/15 bg-white/95 p-4 shadow-[0_22px_44px_rgba(10,30,20,0.2)] backdrop-blur-sm ${
              isDesktop ? 'w-[320px]' : 'w-[calc(100vw-2rem)] max-w-sm'
            }`}
          >
            <input
              ref={(node) => {
                searchInputsRef.current[variant] = node;
              }}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search sections & pages"
              className="w-full rounded-xl border border-emerald-900/20 bg-white px-4 py-2 text-sm text-emerald-950 outline-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(20,194,98,0.15)]"
            />
            <div className="mt-3 max-h-60 overflow-y-auto">
              {filteredSearchItems.length === 0 ? (
                <p className="px-2 py-4 text-sm text-emerald-900/70">No matches found.</p>
              ) : (
                filteredSearchItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSearchSelect(item)}
                    className="flex w-full flex-col items-start gap-1 rounded-xl px-3 py-2 text-left transition hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
                  >
                    <span className="text-sm font-semibold text-emerald-900" style={{ fontFamily: '"Ruigslay"' }}>
                      {item.label}
                    </span>
                    {item.description && (
                      <span className="text-xs text-emerald-900/70" style={{ fontFamily: 'Bricolage Grotesque, -apple-system, Roboto, Helvetica, sans-serif' }}>
                        {item.description}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLogo = (classNameLarge, classNameSymbol) => (
    <Link
      href="/"
      className="flex items-center gap-1"
      aria-label="AlgoTeen Home"
    >
      <span
        className={classNameLarge}
        style={{ fontFamily: '"Ruigslay"', fontWeight: 400, letterSpacing: '-1.92px', textShadow: '0 10px 24px rgba(0, 0, 0, 0.28)' }}
      >
        ALGOTEENS
      </span>
      <span
        className={classNameSymbol}
        style={{ fontFamily: '"Ruigslay"', fontWeight: 600, letterSpacing: '0px' }}
      >
        ©
      </span>
    </Link>
  );

  return (
    <header className="relative w-full" style={{ backgroundColor: '#14C262' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="hidden lg:grid grid-cols-3 items-center">
          <div className="justify-self-start -ml-4 pt-1 text-white">
            {renderLogo('text-[32px] font-normal', 'text-[32px] font-normal')}
          </div>

          <nav
            className={`flex items-center px-1 py-1 justify-self-center gap-1 transition-all duration-300 transform nav-shell ${
              scrollY > 100 ? 'fixed top-4 left-1/2 -translate-x-1/2 z-50 nav-sticky' : ''
            }`}
            role="navigation"
            aria-label="Main navigation"
          >
            {stableNavItems.map(({ id, label }) => (
              <button
                key={id}
                className={`nav-link text-lg font-semibold px-5 py-2 rounded-full ${activeSection === id ? 'active' : 'bg-transparent'}`}
                onClick={() => handleNavClick(id)}
                onKeyDown={(event) => handleKeyDown(event, id)}
                style={{ fontFamily: '"Ruigslay"', color: '#111111', fontWeight: 600, letterSpacing: '0px' }}
                aria-current={activeSection === id ? 'page' : undefined}
                tabIndex={0}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex justify-end justify-self-end -mr-4 pt-1">
            {renderSearchPanel('desktop')}
          </div>
        </div>

        <div className="lg:hidden">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 text-white">
              {renderLogo('text-[24px] font-normal', 'text-[24px] font-normal')}
            </div>

            <div className="flex items-center gap-4">
              {renderSearchPanel('mobile')}
              <button
                onClick={toggleMenu}
                onKeyDown={handleMenuKeyDown}
                className="text-white p-2 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors"
                aria-expanded={isMenuOpen}
                aria-controls="mobile-navigation"
                aria-label="Toggle navigation menu"
                tabIndex={0}
              >
                <div className={`hamburger ${isMenuOpen ? 'open' : ''}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
            </div>
          </div>

          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              isMenuOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
            } ${scrollY > 100 && isMenuOpen ? 'fixed top-16 left-4 right-4 z-50' : ''}`}
          >
            <nav
              id="mobile-navigation"
              className="mobile-menu flex flex-col items-center rounded-2xl py-4 shadow-xl"
              role="navigation"
              aria-label="Mobile navigation"
              style={{ backgroundColor: 'rgba(234, 241, 234, 0.95)' }}
            >
              {stableNavItems.map(({ id, label }) => (
                <button
                  key={id}
                  className={`text-black text-lg font-semibold px-6 py-3 rounded-full mb-2 transition-colors w-full max-w-xs ${
                    activeSection === id ? 'bg-green-500 text-white' : 'hover:bg-gray-200'
                  } focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50`}
                  onClick={() => handleNavClick(id)}
                  onKeyDown={(event) => handleKeyDown(event, id)}
                  style={{ fontFamily: '"Ruigslay"', fontWeight: 600 }}
                  aria-current={activeSection === id ? 'page' : undefined}
                  tabIndex={0}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
