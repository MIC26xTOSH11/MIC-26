"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

const AccordionContext = React.createContext({});

const Accordion = React.forwardRef(({ type, collapsible, value, onValueChange, className, children, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(type === "single" ? "" : []);

  const currentValue = value !== undefined ? value : internalValue;
  const handleValueChange = onValueChange || setInternalValue;

  return (
    <AccordionContext.Provider value={{ type, collapsible, value: currentValue, onValueChange: handleValueChange }}>
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
});
Accordion.displayName = "Accordion";

const AccordionItem = React.forwardRef(({ value, className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={className} data-value={value} {...props}>
      {children}
    </div>
  );
});
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const context = React.useContext(AccordionContext);
  const itemElement = ref?.current?.closest("[data-value]");
  const itemValue = itemElement?.getAttribute("data-value");
  
  const triggerRef = React.useRef(null);
  const combinedRef = ref || triggerRef;

  const isOpen = React.useMemo(() => {
    if (!itemValue) return false;
    if (context.type === "single") {
      return context.value === itemValue;
    }
    return Array.isArray(context.value) && context.value.includes(itemValue);
  }, [context.value, context.type, itemValue]);

  const handleClick = () => {
    if (!itemValue) return;
    
    if (context.type === "single") {
      const newValue = isOpen && context.collapsible ? "" : itemValue;
      context.onValueChange(newValue);
    } else {
      const currentArray = Array.isArray(context.value) ? context.value : [];
      const newValue = isOpen
        ? currentArray.filter((v) => v !== itemValue)
        : [...currentArray, itemValue];
      context.onValueChange(newValue);
    }
  };

  return (
    <button
      ref={combinedRef}
      type="button"
      className={`flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline ${className || ""}`}
      onClick={handleClick}
      {...props}
    >
      {children}
      <ChevronDown
        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </button>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const context = React.useContext(AccordionContext);
  const contentRef = React.useRef(null);
  const combinedRef = ref || contentRef;
  
  const itemElement = combinedRef.current?.closest("[data-value]");
  const itemValue = itemElement?.getAttribute("data-value");

  const isOpen = React.useMemo(() => {
    if (!itemValue) return false;
    if (context.type === "single") {
      return context.value === itemValue;
    }
    return Array.isArray(context.value) && context.value.includes(itemValue);
  }, [context.value, context.type, itemValue]);

  return (
    <div
      ref={combinedRef}
      className={`overflow-hidden text-sm transition-all ${
        isOpen ? "animate-accordion-down" : "animate-accordion-up hidden"
      }`}
      {...props}
    >
      <div className={`pb-4 pt-0 ${className || ""}`}>{children}</div>
    </div>
  );
});
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
