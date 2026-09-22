// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Context } from "../client/src/context";
import { RequestPage } from "../client/src/pages/request";
import { api } from "../client/src/api";
import { seedWorkspace } from "../server/domain";
import type { Bootstrap } from "../shared/types";

vi.mock("../client/src/api", async () => ({
  ...(await vi.importActual("../client/src/api")),
  api: vi.fn(),
}));
const mocked = vi.mocked(api);
beforeEach(() => {
  vi.resetAllMocks();
  mocked.mockResolvedValue({});
});
afterEach(() => cleanup());

function mountRequest(
  changeStatus: "planned" | "in_progress" | "swapped" = "planned",
) {
  const workspace = seedWorkspace("owner");
  const project = workspace.projects[0];
  project.deliverables[3].status = changeStatus;
  if (changeStatus !== "planned") project.version = 2;
  const data: Bootstrap = {
    user: {
      id: "owner",
      name: "Studio owner",
      email: "owner@example.com",
      workspaceId: workspace.id,
      isDemo: true,
    },
    workspace,
    capabilities: { ai: "rules", billing: false, persistence: "local" },
    csrfToken: "test",
  };
  const refresh = vi.fn(async () => {});
  render(
    <Context.Provider
      value={{ data, refresh, setData: vi.fn(), toast: vi.fn() }}
    >
      <MemoryRouter
        initialEntries={[
          `/app/projects/${project.id}/requests/${project.requests[0].id}`,
        ]}
      >
        <Routes>
          <Route
            path="/app/projects/:id/requests/:rid"
            element={<RequestPage />}
          />
        </Routes>
      </MemoryRouter>
    </Context.Provider>,
  );
  return project;
}

describe("request review recovery", () => {
  it("requires an explicit action to remove hidden exchange selections before saving a rebased draft", async () => {
    const user = userEvent.setup();
    const project = mountRequest("swapped");
    expect(
      screen.getByText("Some selected work can no longer be exchanged."),
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Save draft" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(mocked).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Remove unavailable items" }),
    );
    expect(
      screen.queryByText("Some selected work can no longer be exchanged."),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(mocked).toHaveBeenCalledWith(
      `/projects/${project.id}/requests/${project.requests[0].id}`,
      "PATCH",
      expect.objectContaining({ swapIds: [] }),
    );
  });
  it("allows a selected started item to be unchecked but prevents selecting it again", async () => {
    const user = userEvent.setup();
    mountRequest("in_progress");
    const item = screen.getByRole("checkbox", {
      name: /Resource library/,
    }) as HTMLInputElement;
    expect(item.checked).toBe(true);
    expect(item.disabled).toBe(false);
    const review = screen.getByRole("checkbox", {
      name: "I reviewed the scope, estimate, and choices.",
    }) as HTMLInputElement;
    await user.click(review);
    expect(review.checked).toBe(true);
    await user.click(item);
    expect(item.checked).toBe(false);
    expect(item.disabled).toBe(true);
    expect(review.checked).toBe(false);
    expect(
      screen.queryByRole("button", { name: "Remove unavailable items" }),
    ).toBeNull();
  });
  it("freezes the reviewed fields while a save is in flight", async () => {
    const user = userEvent.setup();
    mountRequest();
    let finish!: (value: unknown) => void;
    mocked.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(
      (screen.getByLabelText("Confirmed effort (hours)") as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(
      (
        screen.getByLabelText(
          /Extra calendar days if added/,
        ) as HTMLInputElement
      ).disabled,
    ).toBe(true);
    expect(
      (screen.getByLabelText("A note for your client") as HTMLTextAreaElement)
        .disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("checkbox", {
          name: /Resource library/,
        }) as HTMLInputElement
      ).disabled,
    ).toBe(true);
    finish({});
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Save draft",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    expect(mocked).toHaveBeenCalledTimes(1);
  });
});
