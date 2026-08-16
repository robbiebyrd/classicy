import "./ClassicyForm.scss";
import classNames from "classnames";
import type {
	FormEvent,
	FormHTMLAttributes,
	FC as FunctionalComponent,
	PropsWithChildren,
} from "react";

type ClassicyFormProps = PropsWithChildren<{
	/**
	 * Called on submit (a submit ClassicyButton, or Enter inside a field).
	 * The native page navigation is always prevented first — a Classicy form
	 * never leaves the desktop.
	 */
	onSubmitFunc?: (e: FormEvent<HTMLFormElement>) => void;
	/**
	 * `default` stacks rows with the HIG item gap; `dialog` additionally
	 * applies the HIG dialog edge inset — the layout for a form that fills a
	 * modal ClassicyWindow.
	 */
	layout?: "default" | "dialog";
	className?: string;
}> &
	Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit">;

/**
 * The `<form>` equivalent: a real form element with Platinum dialog layout.
 * Deliberately thin — it owns submit semantics and spacing only; controls
 * stay controlled by the consumer. Make the confirming `ClassicyButton` the
 * default button with `isDefault buttonType="submit"` so Enter both submits
 * and reads as pressing it.
 */
export const ClassicyForm: FunctionalComponent<ClassicyFormProps> = ({
	onSubmitFunc,
	layout = "default",
	className,
	children,
	...rest
}) => {
	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		onSubmitFunc?.(e);
	};

	return (
		<form
			{...rest}
			className={classNames(
				"classicyForm",
				layout === "dialog" ? "classicyFormDialog" : "",
				className,
			)}
			onSubmit={handleSubmit}
		>
			{children}
		</form>
	);
};

/**
 * The HIG dialog button row: right-aligned, Cancel to the left of the
 * default (confirming) button, HIG button gap, set off from the controls
 * above by the group gap.
 */
export const ClassicyFormButtonRow: FunctionalComponent<
	PropsWithChildren<{ className?: string }>
> = ({ className, children }) => (
	<div className={classNames("classicyFormButtonRow", className)}>
		{children}
	</div>
);
