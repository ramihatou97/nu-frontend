/**
 * @fileoverview Virtual list hook for rendering large lists efficiently
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * @typedef {Object} VirtualListConfig
 * @property {number} itemHeight - Height of each item in pixels
 * @property {number} overscan - Number of items to render outside viewport
 * @property {number} containerHeight - Height of the container
 */

/**
 * @typedef {Object} VirtualListResult
 * @property {Array} virtualItems - Items to render
 * @property {number} totalHeight - Total height of all items
 * @property {number} startIndex - First visible index
 * @property {number} endIndex - Last visible index
 * @property {Function} scrollTo - Scroll to index function
 * @property {Object} containerProps - Props for container element
 * @property {Object} wrapperProps - Props for wrapper element
 */

/**
 * Virtual list hook for efficient rendering of long lists
 * @param {Array} items - Full list of items
 * @param {VirtualListConfig} config - Configuration options
 * @returns {VirtualListResult}
 */
export function useVirtualList(items, config) {
  const {
    itemHeight = 40,
    overscan = 5,
    containerHeight = 400,
  } = config;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const totalHeight = items.length * itemHeight;

  const { startIndex, endIndex, virtualItems } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);

    const virtual = [];
    for (let i = start; i <= end; i++) {
      virtual.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute',
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        },
      });
    }

    return { startIndex: start, endIndex: end, virtualItems: virtual };
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const scrollTo = useCallback((index) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, [itemHeight]);

  const scrollToItem = useCallback((index, align = 'start') => {
    if (!containerRef.current) return;

    let targetTop;
    switch (align) {
      case 'center':
        targetTop = index * itemHeight - containerHeight / 2 + itemHeight / 2;
        break;
      case 'end':
        targetTop = (index + 1) * itemHeight - containerHeight;
        break;
      default: // 'start'
        targetTop = index * itemHeight;
    }

    containerRef.current.scrollTop = Math.max(0, Math.min(targetTop, totalHeight - containerHeight));
  }, [itemHeight, containerHeight, totalHeight]);

  const containerProps = {
    ref: containerRef,
    onScroll: handleScroll,
    style: {
      height: containerHeight,
      overflow: 'auto',
      position: 'relative',
    },
  };

  const wrapperProps = {
    style: {
      height: totalHeight,
      position: 'relative',
    },
  };

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    scrollTo,
    scrollToItem,
    containerProps,
    wrapperProps,
  };
}

/**
 * Hook for windowed rendering with dynamic heights
 * @param {Array} items - List of items
 * @param {Function} getItemHeight - Function to get item height
 * @param {Object} config - Configuration
 * @returns {Object} Virtual list state
 */
export function useDynamicVirtualList(items, getItemHeight, config) {
  const { containerHeight = 400, overscan = 3 } = config;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const heightCache = useRef(new Map());

  // Calculate cumulative heights
  const { heights, totalHeight } = useMemo(() => {
    let total = 0;
    const h = items.map((item, i) => {
      const cached = heightCache.current.get(i);
      const height = cached ?? getItemHeight(item, i);
      const result = { offset: total, height };
      total += height;
      return result;
    });
    return { heights: h, totalHeight: total };
  }, [items, getItemHeight]);

  // Find visible range using binary search
  const { startIndex, endIndex, virtualItems } = useMemo(() => {
    if (heights.length === 0) {
      return { startIndex: 0, endIndex: 0, virtualItems: [] };
    }

    // Binary search for start
    let low = 0;
    let high = heights.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (heights[mid].offset + heights[mid].height < scrollTop) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    const start = Math.max(0, low - overscan);

    // Find end
    let end = start;
    let accum = heights[start]?.offset || 0;
    while (end < heights.length && accum < scrollTop + containerHeight) {
      accum += heights[end].height;
      end++;
    }
    end = Math.min(heights.length - 1, end + overscan);

    const virtual = [];
    for (let i = start; i <= end; i++) {
      virtual.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute',
          top: heights[i].offset,
          left: 0,
          right: 0,
          height: heights[i].height,
        },
      });
    }

    return { startIndex: start, endIndex: end, virtualItems: virtual };
  }, [heights, scrollTop, containerHeight, overscan, items]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const measureItem = useCallback((index, height) => {
    heightCache.current.set(index, height);
  }, []);

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    containerProps: {
      ref: containerRef,
      onScroll: handleScroll,
      style: { height: containerHeight, overflow: 'auto', position: 'relative' },
    },
    wrapperProps: {
      style: { height: totalHeight, position: 'relative' },
    },
    measureItem,
  };
}

export default useVirtualList;
