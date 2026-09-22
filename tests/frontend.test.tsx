// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Context } from "../client/src/context";
import { ProjectModal } from "../client/src/pages/projects";
import { Offer } from "../client/src/pages/offer";
import { api } from "../client/src/api";
import { projectInput } from "../server/validation";
import type { Bootstrap, PublicOffer } from "../shared/types";
vi.mock("../client/src/api", async () => ({
  ...(await vi.importActual("../client/src/api")),
  api: vi.fn(),
}));
const mocked = vi.mocked(api);
const user = userEvent.setup();
afterEach(() => cleanup());
beforeEach(() => {
  vi.clearAllMocks();
});
const context = {
  data: null as Bootstrap | null,
  refresh: vi.fn(async () => {}),
  setData: vi.fn(),
  toast: vi.fn(),
};
function mount(children: React.ReactNode) {
  return render(
    <Context.Provider value={context}>
      <MemoryRouter>{children}</MemoryRouter>
    </Context.Provider>,
  );
}
const offer: PublicOffer = {
  workspaceName: "Test Studio",
  projectName: "Test website",
  client: "Test Client",
  currency: "USD",
  dueDate: "2026-10-20",
  version: 1,
  request: {
    id: "req",
    title: "Spanish pages",
    message: "Please add Spanish pages.",
    hours: 12,
    status: "shared",
    baselineVersion: 1,
    swapIds: ["library"],
    feeCents: 150000,
    scheduleDays: 2,
    note: "Approved translations supplied.",
    createdAt: "2026-09-22T00:00:00Z",
  },
  removed: [
    {
      id: "library",
      title: "Resource library",
      description: "Eight articles",
      hours: 16,
      status: "planned",
      locked: false,
      dependsOn: [],
    },
  ],
  rateCents: 12500,
  capacityHoursPerDay: 6,
  currentHours: 96,
  budgetCents: 1200000,
  isDemo: true,
};
function mountOffer() {
  return render(
    <MemoryRouter initialEntries={["/offer/test-token"]}>
      <Routes>
        <Route path="/offer/:token" element={<Offer />} />
      </Routes>
    </MemoryRouter>,
  );
}
describe("real frontend workflow contracts", () => {
  it("submits a new project payload that the strict server schema actually accepts", async () => {
    mocked.mockResolvedValue({ id: "created" });
    mount(<ProjectModal close={vi.fn()} />);
    await user.type(screen.getByLabelText("Project name"), "Customer launch");
    await user.type(screen.getByLabelText("Client or company"), "Customer Co");
    await user.type(
      screen.getByLabelText("Scope and boundaries"),
      "Six English pages. Translations excluded.",
    );
    await user.type(screen.getByLabelText("Deliverable"), "Resource library");
    await user.type(
      screen.getByLabelText("Acceptance criteria"),
      "Eight articles and filters",
    );
    await user.click(screen.getByRole("button", { name: /Create project/ }));
    await waitFor(() => expect(mocked).toHaveBeenCalled());
    const payload = mocked.mock.calls[0][2];
    expect(projectInput.safeParse(payload).success).toBe(true);
    expect(payload).toMatchObject({
      budgetCents: 600000,
      rateCents: 10000,
      costRateCents: 5000,
      capacityHoursPerDay: 6,
    });
    expect(payload).not.toHaveProperty("budget");
  });
  it("shows before and after totals, requires review, and renders a stable client receipt", async () => {
    mocked.mockResolvedValueOnce(offer);
    mountOffer();
    await screen.findByRole("heading", { name: /Let’s make room/ });
    expect(
      screen
        .getByRole("button", { name: "Confirm scope exchange" })
        .hasAttribute("disabled"),
    ).toBe(true);
    await user.click(screen.getByRole("radio", { name: /Add to the project/ }));
    expect(screen.getByText("$13,500")).toBeTruthy();
    expect(screen.getByText("Oct 22, 2026")).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: /Exchange scope/ }));
    await user.type(screen.getByLabelText("Your full name"), "Test Client");
    await user.click(screen.getByRole("checkbox"));
    mocked.mockResolvedValueOnce({ ok: true, choice: "swap", version: 2 });
    mocked.mockResolvedValueOnce({
      ...offer,
      version: 2,
      request: {
        ...offer.request,
        status: "accepted",
        choice: "swap",
        clientName: "Test Client",
        decidedAt: "2026-09-22T00:00:00Z",
        acceptedVersion: 2,
      },
    });
    await user.click(
      screen.getByRole("button", { name: "Confirm scope exchange" }),
    );
    await screen.findByRole("heading", { name: "Your decision receipt" });
    expect(mocked.mock.calls[1]).toEqual([
      "/offers/test-token/decide",
      "POST",
      { choice: "swap", clientName: "Test Client", acknowledged: true },
    ]);
    expect(screen.getByText("Agreed project total")).toBeTruthy();
    expect(screen.getByText("$12,000")).toBeTruthy();
  });
  it("blocks stale client proposals before accepting a decision", async () => {
    mocked.mockResolvedValueOnce({ ...offer, version: 2 });
    mountOffer();
    await screen.findByText("This proposal needs a fresh look.");
    expect(screen.queryByRole("button", { name: /Confirm/ })).toBeNull();
  });
  it("traps modal keyboard focus and supports Escape", async () => {
    const close = vi.fn();
    mount(
      <>
        <button>Open project</button>
        <ProjectModal close={close} />
      </>,
    );
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close dialog" }),
    );
    fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /Create project/ }),
    );
    await user.keyboard("{Escape}");
    expect(close).toHaveBeenCalled();
  });
});
