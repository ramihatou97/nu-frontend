import React, { memo, useCallback, useId, useRef } from 'react';

/**
 * @typedef {Object} Tab
 * @property {string} id - Unique tab identifier
 * @property {string} label - Tab label text
 * @property {React.ReactNode} [icon] - Optional tab icon
 * @property {boolean} [disabled] - Whether tab is disabled
 */

/**
 * @typedef {Object} TabsProps
 * @property {Tab[]} tabs - Array of tab definitions
 * @property {string} activeTab - Currently active tab ID
 * @property {(tabId: string) => void} onChange - Tab change handler
 * @property {'horizontal'|'vertical'} [orientation='horizontal']
 */

/**
 * Accessible tabs component with keyboard navigation
 * @param {TabsProps} props
 */
function Tabs({
  tabs,
  activeTab,
  onChange,
  orientation = 'horizontal',
  className = '',
}) {
  const baseId = useId();
  const tabListRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      const enabledTabs = tabs.filter((t) => !t.disabled);
      const currentIndex = enabledTabs.findIndex((t) => t.id === activeTab);

      let nextIndex = currentIndex;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = (currentIndex + 1) % enabledTabs.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = enabledTabs.length - 1;
          break;
        default:
          return;
      }

      const nextTab = enabledTabs[nextIndex];
      if (nextTab) {
        onChange(nextTab.id);
        const button = tabListRef.current?.querySelector(
          `[data-tab-id="${nextTab.id}"]`
        );
        button?.focus();
      }
    },
    [tabs, activeTab, onChange]
  );

  return (
    <div
      className={`tabs tabs-${orientation} ${className}`}
      role="tablist"
      aria-orientation={orientation}
      ref={tabListRef}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const tabId = `${baseId}-tab-${tab.id}`;
        const panelId = `${baseId}-panel-${tab.id}`;

        return (
          <button
            key={tab.id}
            id={tabId}
            role="tab"
            aria-selected={isActive}
            aria-controls={panelId}
            aria-disabled={tab.disabled || undefined}
            disabled={tab.disabled}
            tabIndex={isActive ? 0 : -1}
            data-tab-id={tab.id}
            className={`tab ${isActive ? 'tab-active' : ''}`}
            onClick={() => !tab.disabled && onChange(tab.id)}
          >
            {tab.icon && (
              <span className="tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
            )}
            <span className="tab-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default memo(Tabs);
