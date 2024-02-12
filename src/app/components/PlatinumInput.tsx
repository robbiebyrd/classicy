import classNames from "classnames";
import React from "react";
import platinumInputStyles from "./PlatinumInput.module.scss";

interface PlatinumInputProps {
    id: string;
    inputType?: string;
    onChangeFunc?: any;
    labelTitle?: string;
    placeholder?: string;
    prefillValue?: string;
    isDisabled?: boolean;
    isDefault?: boolean;
}

const PlatinumInput: React.FC<PlatinumInputProps> = ({
                                                         id,
                                                         inputType = "text",
                                                         labelTitle,
                                                         placeholder,
                                                         prefillValue,
                                                         isDisabled,
                                                         isDefault,
                                                         onChangeFunc
                                                     }) => {

    return (<>
        {labelTitle &&
            <label htmlFor={id} className={platinumInputStyles.platinumInputLabel}>{labelTitle}</label>
        }
        <input id={id}
               onChange={onChangeFunc}
               name={id}
               type={inputType}
               disabled={isDisabled}
               value={prefillValue}
               placeholder={placeholder}
               className={classNames(
                   platinumInputStyles.platinumInput, isDefault ? platinumInputStyles.platinumInputDefault : "")}
        ></input>
    </>);
};

export default PlatinumInput;
