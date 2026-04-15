import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import SimpleCard = formattingSettings.SimpleCard;
import ToggleSwitch = formattingSettings.ToggleSwitch;
import Slice = formattingSettings.Slice;

export class LayoutCardSettings extends SimpleCard {
    public stackedBars = new ToggleSwitch({
        name: "stackedBars",
        displayName: "Stacked Bars",
        value: false,
    });

    public slices: Slice[] = [this.stackedBars];
    public name: string = "layout";
    public displayName: string = "Layout";
}
