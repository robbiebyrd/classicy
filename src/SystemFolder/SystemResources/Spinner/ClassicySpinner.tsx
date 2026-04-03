import {
	ClassicyControlLabel,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import "./ClassicySpinner.scss";
import classNames from "classnames";
import {
	type ChangeEvent,
	type ChangeEventHandler,
	type ForwardedRef,
	type FC as FunctionalComponent,
	forwardRef,
	type KeyboardEventHandler,
	useEffect,
	useRef,
	useState,
} from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

const REPEAT_INTERVAL_MS = 100;
const STEP_ESCALATION_MS = 3000;

interface ClassicySpinnerProps {
	id: string;
	inputType?: "number";
	onChangeFunc?: ChangeEventHandler<HTMLInputElement>;
	onEnterFunc?: () => void;
	labelTitle?: string;
	labelPosition?: ClassicyLabelPosition;
	placeholder?: number;
	prefillValue?: number;
	minValue?: number;
	maxValue?: number;
	disabled?: boolean;
	isDefault?: boolean;
	backgroundColor?: string;
	ref?: ForwardedRef<HTMLInputElement>;
}

export const ClassicySpinner: FunctionalComponent<ClassicySpinnerProps> =
	forwardRef<HTMLInputElement, ClassicySpinnerProps>(function ClassicySpinner(
		{
			id,
			inputType = "number",
			labelTitle,
			labelPosition = "above",
			placeholder,
			prefillValue,
			minValue = 0,
			maxValue,
			disabled = false,
			isDefault,
			backgroundColor,
			onChangeFunc,
			onEnterFunc,
		},
		ref,
	) {
		const { track } = useClassicyAnalytics();
		const analyticsArgs = {
			id,
			inputType,
			labelTitle,
			placeholder,
			prefillValue,
			disabled,
			isDefault,
		};

		// Keep these in refs so the interval callback always sees current values
		const minValueRef = useRef(minValue);
		minValueRef.current = minValue;
		const maxValueRef = useRef(maxValue);
		maxValueRef.current = maxValue;
		const onChangeFuncRef = useRef(onChangeFunc);
		onChangeFuncRef.current = onChangeFunc;

		const clamp = (val: number): number => {
			let result = val;
			if (result < minValueRef.current) result = minValueRef.current;
			if (maxValueRef.current !== undefined && result > maxValueRef.current) {
				result = maxValueRef.current;
			}
			return result;
		};

		const initialValue = clamp(prefillValue ?? minValue);
		const [value, setValue] = useState<number>(initialValue);
		const valueRef = useRef<number>(initialValue);

		useEffect(() => {
			if (prefillValue !== undefined) {
				const clamped = clamp(prefillValue);
				valueRef.current = clamped;
				setValue(clamped);
			}
		}, [prefillValue]); // eslint-disable-line react-hooks/exhaustive-deps

		const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
		const mouseDownTimeRef = useRef<number>(0);

		// Cleanup interval on unmount
		useEffect(() => {
			return () => {
				if (intervalRef.current !== null) clearInterval(intervalRef.current);
			};
		}, []);

		const notifyChange = (val: number) => {
			onChangeFuncRef.current?.({
				target: { value: String(val) },
			} as ChangeEvent<HTMLInputElement>);
		};

		const applyDelta = (direction: 1 | -1, step: number) => {
			const next = clamp(valueRef.current + direction * step);
			valueRef.current = next;
			setValue(next);
			notifyChange(next);
		};

		const stopRepeat = () => {
			if (intervalRef.current !== null) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};

		const startRepeat = (direction: 1 | -1) => {
			mouseDownTimeRef.current = Date.now();
			intervalRef.current = setInterval(() => {
				const elapsed = Date.now() - mouseDownTimeRef.current;
				const magnitude = Math.floor(elapsed / STEP_ESCALATION_MS);
				const step = 10 ** magnitude;
				applyDelta(direction, step);
			}, REPEAT_INTERVAL_MS);
		};

		const handleButtonMouseDown = (direction: 1 | -1) => {
			if (disabled) return;
			applyDelta(direction, 1);
			startRepeat(direction);
		};

		const handleOnChangeFunc: ChangeEventHandler<HTMLInputElement> = (e) => {
			const num = Number(e.target.value);
			if (!Number.isNaN(num)) {
				const clamped = clamp(num);
				valueRef.current = clamped;
				setValue(clamped);
			}
			track("selected", { ...analyticsArgs, selected: e.target.value });
			if (onChangeFunc) onChangeFunc(e);
		};

		const handleOnKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
			if (e.key === "Enter" && onEnterFunc) {
				onEnterFunc();
			}
		};

		return (
			<div
				className={classNames(
					"classicySpinnerHolder",
					labelPositionClass(labelPosition),
				)}
			>
				{labelTitle && (
					<ClassicyControlLabel
						label={labelTitle}
						labelFor={id}
						disabled={disabled}
					/>
				)}
				<div className={"classicySpinnerInputGroup"}>
					<input
						id={id}
						tabIndex={0}
						onChange={handleOnChangeFunc}
						onKeyDown={handleOnKeyDown}
						name={id}
						type={inputType}
						ref={ref}
						disabled={disabled}
						value={value}
						placeholder={placeholder ? String(placeholder) : undefined}
						autoComplete="off"
						className={classNames(
							"classicySpinner",
							isDefault ? "classicySpinnerDefault" : "",
						)}
						style={backgroundColor ? { backgroundColor } : undefined}
					/>
					<div className={"classicySpinnerButtons"}>
						<button
							type="button"
							aria-label="Increment"
							disabled={disabled}
							onMouseDown={() => handleButtonMouseDown(1)}
							onMouseUp={stopRepeat}
							onMouseLeave={stopRepeat}
						>
							^
						</button>
						<button
							type="button"
							aria-label="Decrement"
							disabled={disabled}
							onMouseDown={() => handleButtonMouseDown(-1)}
							onMouseUp={stopRepeat}
							onMouseLeave={stopRepeat}
						>
							v
						</button>
					</div>
				</div>
			</div>
		);
	});
