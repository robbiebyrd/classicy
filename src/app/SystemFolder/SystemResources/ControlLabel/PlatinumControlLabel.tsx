import platinumControlLabelStyles
    from "@/app/SystemFolder/SystemResources/ControlLabel/PlatinumControlLabel.module.scss";
import classNames from "classnames";
import React from "react";

interface PlatinumControlLabelProps {
    labelFor?: string;
    label?: string;
    disabled?: boolean;
    icon?: string;
    iconSize?: string;
    direction?: "left" | "right";
    children?: any;
}

const PlatinumControlLabel: React.FC<PlatinumControlLabelProps> = ({
                                                                       labelFor = "",
                                                                       label = "",
                                                                       disabled = false,
                                                                       direction = "left",
                                                                       icon,
                                                                       iconSize,
    children
                                                                   }) => {

    const getDirectionClass = (direction: string) => {
        if (direction === "right") {
            return platinumControlLabelStyles.platinumControlLabelRight;
        }
        return platinumControlLabelStyles.platinumControlLabelLeft;
    }

    const imageSize = (size: string) => {
        if (iconSize === "sm") {
            return "16px";
        }
        if (iconSize === "lg") {
            return "64px";
        }
        return "32px";
    }

    if (label !== "") {
        return (
            <div style={{display: "flex", flexDirection: ["left", "bottom"].includes(direction) ? "row" : "row-reverse", alignItems: icon ? "center" : ""}}>
                {icon && (
                    <img src={icon} width={imageSize(iconSize)} alt={label}/>
                )}

                {["left", "bottom"].includes(direction) && children}

                <label htmlFor={labelFor}
                       className={classNames(
                           platinumControlLabelStyles.platinumControlLabel,
                           disabled ? platinumControlLabelStyles.platinumControlLabelDisabled : "",
                           getDirectionClass(direction)
                       )}>
                    {label}
                </label>

                {["right", "top"].includes(direction) && children}

            </div>
        );
    }
};

export default PlatinumControlLabel;
