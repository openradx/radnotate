import {PaletteMode, Tooltip, tooltipClasses} from "@mui/material";
import {styled} from "@mui/styles";
import React from "react";
import {classes} from "@mui/lab/ClockPicker/ClockNumber";


export const getTheme = (mode: PaletteMode) => ({
    typography: {
      fontSize: 12
    },
    palette: {
        mode,
        ...(mode === 'light'
            ? {
                primary: {
                    main: '#00376d',
                },
                secondary: {
                    main: '#de751a',
                },
            }
            : {
                primary: {
                    main: '#de751a',
                },
                secondary: {
                    main: '#de751a',
                },
            }),
    },
    components: {
        MuiSpeedDial: {
            defaultProps: {
                transitionDuration: 0
            }
        }
    }
});

export const CustomWidthTooltip = styled(({ className, ...props }) => (
    <Tooltip {...props} classes={{ popper: className }} />
))({
    [`& .${tooltipClasses.tooltip}`]: {
        maxWidth: 200,
    },
});