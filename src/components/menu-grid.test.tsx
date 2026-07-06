import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { MenuGrid, MENU_GROUPS } from "./menu-grid";

// Every route the old flat bottom bar reached, except the home (/today), which
// is the persistent Home nav item.
const REQUIRED_ROUTES = ["/numbers", "/glucose", "/medicines", "/food", "/plan", "/visits", "/chat", "/checkin", "/support", "/intake", "/privacy"];

describe("MenuGrid reachability", () => {
  it("renders a link to every destination so collapsing the tab bar orphans no route", () => {
    render(<MenuGrid />);
    const hrefs = [...document.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    for (const route of REQUIRED_ROUTES) {
      expect(hrefs, `menu must reach ${route}`).toContain(route);
    }
  });

  it("keeps exactly the catalog routes grouped, with no duplicates", () => {
    const flat = MENU_GROUPS.flatMap((group) => group.items.map((item) => item.href));
    expect(flat.length).toBe(REQUIRED_ROUTES.length);
    expect(new Set(flat)).toEqual(new Set(REQUIRED_ROUTES));
  });
});
