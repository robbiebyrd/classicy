import platinumInputCheckboxStyles from "@/app/SystemFolder/SystemResources/Checkbox/PlatinumInputCheckbox.module.scss";
import PlatinumControlLabel from "@/app/SystemFolder/SystemResources/ControlLabel/PlatinumControlLabel";
import classNames from "classnames";
import React from "react";

type PlatinumInputCheckboxProps = {
    id: string;
    name: string;
    checked?: boolean;
    mixed?: boolean;
    isDefault?: boolean;
    disabled?: boolean;
    onClick?: any;
    label?: string;
}
const PlatinumInputCheckbox: React.FC<PlatinumInputCheckboxProps> = (
    {
        id,
        name,
        checked,
        mixed,
        isDefault,
        disabled,
        onClick,
        label
    }
) => {

    return (
        <div className={platinumInputCheckboxStyles.platinumInputCheckboxGroup}>
            <input type={"checkbox"} onClick={onClick}
                   checked={checked}
                   id={id}
                   name={name}
                   disabled={disabled}
                   className={classNames(
                       platinumInputCheckboxStyles.platinumInputCheckbox,
                       isDefault ? platinumInputCheckboxStyles.platinumInputCheckboxDefault : "",
                       mixed ? platinumInputCheckboxStyles.platinumInputCheckboxMixed : ""
                   )}/>
            <PlatinumControlLabel label={label} labelFor={id} disabled={disabled}></PlatinumControlLabel>
        </div>
    );
};
export default PlatinumInputCheckbox;

