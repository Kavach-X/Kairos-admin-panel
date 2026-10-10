"use client";

import * as React from "react";
import { Search, ChevronDown, Check, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options?: SearchableOption[];
  value: string;
  onValueChange: (value: string, selectedOption?: SearchableOption) => void;
  onSearch?: (query: string) => Promise<SearchableOption[]>;
  selectedOption?: SearchableOption | null;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  hideListUntilSearch?: boolean;
  searchPromptText?: string;
  noResultsText?: string;
  loadingText?: string;
}

export function SearchableSelect({
  options = [],
  value,
  onValueChange,
  onSearch,
  selectedOption: externalSelectedOption,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  disabled = false,
  className,
  hideListUntilSearch = false,
  searchPromptText = "Type to search...",
  noResultsText = "No matching options found",
  loadingText = "Searching...",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [asyncOptions, setAsyncOptions] = React.useState<SearchableOption[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [cachedSelected, setCachedSelected] = React.useState<SearchableOption | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const searchId = React.useId();

  // Find currently selected option: check external prop, then provided options, then cached selection
  const currentSelected = React.useMemo(() => {
    if (externalSelectedOption && externalSelectedOption.value === value) {
      return externalSelectedOption;
    }
    const foundInOptions = options.find((opt) => opt.value === value);
    if (foundInOptions) return foundInOptions;
    if (cachedSelected && cachedSelected.value === value) return cachedSelected;
    return null;
  }, [externalSelectedOption, value, options, cachedSelected]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Handle async search debouncing
  React.useEffect(() => {
    if (!onSearch) return;

    if (!open) {
      setSearch("");
      setAsyncOptions([]);
      setIsSearching(false);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    const trimmed = search.trim();
    if (!trimmed) {
      setAsyncOptions([]);
      setIsSearching(false);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    setIsSearching(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await onSearch(trimmed);
        setAsyncOptions(results || []);
      } catch (err) {
        console.error("SearchableSelect search error:", err);
        setAsyncOptions([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [search, open, onSearch]);

  // Static options filtering if onSearch is not used
  const filteredOptions = React.useMemo(() => {
    if (onSearch) return asyncOptions;
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  }, [onSearch, asyncOptions, options, search]);

  const showPrompt = onSearch
    ? !search.trim()
    : hideListUntilSearch && !search.trim();

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-1 text-xs shadow-2xs transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-muted/30",
          disabled && "cursor-not-allowed opacity-50",
          open && "border-primary/50 ring-1 ring-primary/20"
        )}
      >
        <span
          className={cn(
            "truncate text-left",
            !currentSelected && "text-muted-foreground"
          )}
        >
          {currentSelected ? (
            <span className="flex items-center gap-1.5 truncate">
              <span className="font-medium text-foreground truncate">
                {currentSelected.label}
              </span>
              {currentSelected.subLabel && (
                <span className="text-[10px] text-muted-foreground truncate">
                  ({currentSelected.subLabel})
                </span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ml-2",
            open && "rotate-180 text-foreground"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
          {/* Search bar inside the dropdown */}
          <div className="flex items-center border-b border-border/60 px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name={`search_${searchId}`}
              data-lpignore="true"
              data-form-type="other"
              aria-autocomplete="none"
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            {isSearching ? (
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
            ) : search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto p-1 text-xs">
            {isSearching && filteredOptions.length === 0 ? (
              <div className="py-5 px-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>{loadingText}</span>
              </div>
            ) : showPrompt ? (
              <div className="py-5 px-3 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
                <Search className="h-4 w-4 text-muted-foreground/40" />
                <span>{searchPromptText}</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {noResultsText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setCachedSelected(opt);
                      onValueChange(opt.value, opt);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors",
                      "hover:bg-muted/80 hover:text-foreground",
                      isSelected && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
