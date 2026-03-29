import { Separator } from "@/components/ui/separator";
import { FrequencySection } from "./parameters/FrequencySection";
import { ModulationSection } from "./parameters/ModulationSection";
import { ReceiverSection } from "./parameters/ReceiverSection";
import { PacketSection } from "./parameters/PacketSection";
import { GpioSection } from "./parameters/GpioSection";
import { PowerSection } from "./parameters/PowerSection";

export function ParameterPanel() {
  return (
    <div className="p-4 space-y-4">
      <FrequencySection />
      <Separator />
      <ModulationSection />
      <Separator />
      <ReceiverSection />
      <Separator />
      <PacketSection />
      <Separator />
      <GpioSection />
      <Separator />
      <PowerSection />
    </div>
  );
}
