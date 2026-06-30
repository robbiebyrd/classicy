// src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.test.tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/__tests__/test-utils";
import { createRef } from "react";
import { ClassicyFileInput, type ClassicyFileInputHandle } from "@/SystemFolder/SystemResources/FileInput/ClassicyFileInput";

vi.mock("@/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss", () => ({}));
vi.mock("@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss", () => ({}));
vi.mock("@/SystemFolder/SystemResources/Button/ClassicyButton.scss", () => ({}));
vi.mock("@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics", () => ({
    useClassicyAnalytics: () => ({ track: vi.fn() }),
}));
vi.mock("@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext", () => ({
    useSoundDispatch: () => vi.fn(),
}));

function addFiles(files: File[]) {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: files, configurable: true });
    fireEvent.change(input);
}

describe("ClassicyFileInput", () => {
    it("renders a hidden file input", () => {
        render(<ClassicyFileInput id="fi-test" />);
        expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
    });

    it("renders a label when labelTitle is provided", () => {
        render(<ClassicyFileInput id="fi-test" labelTitle="Attachments" />);
        expect(screen.getByText("Attachments")).toBeInTheDocument();
    });

    it("renders a Choose Files button", () => {
        render(<ClassicyFileInput id="fi-test" multiple />);
        expect(screen.getByRole("button", { name: /choose files/i })).toBeInTheDocument();
    });

    it("renders a Choose File button when multiple is false", () => {
        render(<ClassicyFileInput id="fi-test" />);
        expect(screen.getByRole("button", { name: /choose file/i })).toBeInTheDocument();
    });

    it("shows filename after a file is selected", async () => {
        render(<ClassicyFileInput id="fi-test" multiple />);
        addFiles([new File(["x"], "photo.png", { type: "image/png" })]);
        await waitFor(() => expect(screen.getByText("photo.png")).toBeInTheDocument());
    });

    it("calls onChangeFunc with the added file list", async () => {
        const onChange = vi.fn();
        render(<ClassicyFileInput id="fi-test" multiple onChangeFunc={onChange} />);
        const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
        addFiles([file]);
        await waitFor(() => expect(onChange).toHaveBeenCalledWith([file]));
    });

    it("removes a file when its remove button is clicked", async () => {
        render(<ClassicyFileInput id="fi-test" multiple />);
        addFiles([new File(["x"], "photo.png", { type: "image/png" })]);
        await waitFor(() => screen.getByText("photo.png"));
        fireEvent.click(screen.getByRole("button", { name: /remove photo\.png/i }));
        expect(screen.queryByText("photo.png")).not.toBeInTheDocument();
    });

    it("calls onChangeFunc with updated list after remove", async () => {
        const onChange = vi.fn();
        render(<ClassicyFileInput id="fi-test" multiple onChangeFunc={onChange} />);
        const file = new File(["x"], "a.png", { type: "image/png" });
        addFiles([file]);
        await waitFor(() => screen.getByText("a.png"));
        fireEvent.click(screen.getByRole("button", { name: /remove a\.png/i }));
        expect(onChange).toHaveBeenLastCalledWith([]);
    });

    it("shows error when maxFiles is exceeded", async () => {
        render(<ClassicyFileInput id="fi-test" multiple maxFiles={2} />);
        addFiles([
            new File(["x"], "a.png", { type: "image/png" }),
            new File(["x"], "b.png", { type: "image/png" }),
            new File(["x"], "c.png", { type: "image/png" }),
        ]);
        await waitFor(() => expect(screen.getByText(/max 2 files/i)).toBeInTheDocument());
    });

    it("shows error when a file exceeds maxFileSizeMb", async () => {
        render(<ClassicyFileInput id="fi-test" multiple maxFileSizeMb={1} />);
        addFiles([new File([new Uint8Array(2 * 1024 * 1024)], "big.png", { type: "image/png" })]);
        await waitFor(() => expect(screen.getByText(/exceeds 1 mb/i)).toBeInTheDocument());
    });

    it("does not add files when validation fails", async () => {
        render(<ClassicyFileInput id="fi-test" multiple maxFiles={1} />);
        addFiles([
            new File(["x"], "a.png", { type: "image/png" }),
            new File(["x"], "b.png", { type: "image/png" }),
        ]);
        await waitFor(() => screen.getByText(/max 1 files/i));
        expect(screen.queryByText("a.png")).not.toBeInTheDocument();
    });

    it("addFiles ref method adds files to the list", async () => {
        const ref = createRef<ClassicyFileInputHandle>();
        render(<ClassicyFileInput ref={ref} id="fi-test" multiple />);
        const file = new File(["x"], "screen.png", { type: "image/png" });
        ref.current?.addFiles([file]);
        await waitFor(() => expect(screen.getByText("screen.png")).toBeInTheDocument());
    });

    it("addFiles calls onChangeFunc", async () => {
        const onChange = vi.fn();
        const ref = createRef<ClassicyFileInputHandle>();
        render(<ClassicyFileInput ref={ref} id="fi-test" multiple onChangeFunc={onChange} />);
        const file = new File(["x"], "screen.png", { type: "image/png" });
        ref.current?.addFiles([file]);
        await waitFor(() => expect(onChange).toHaveBeenCalledWith([file]));
    });

    it("disabled prop disables the native input", () => {
        render(<ClassicyFileInput id="fi-test" disabled />);
        expect(document.querySelector('input[type="file"]')).toBeDisabled();
    });
});
