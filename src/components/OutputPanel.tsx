import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegisterTable } from "./output/RegisterTable";
import { CCodeView } from "./output/CCodeView";
import { FlipperView } from "./output/FlipperView";
import { ParameterPanel } from "./ParameterPanel";

export function OutputPanel() {
  const defaultTab = typeof window !== "undefined" && window.innerWidth < 768 ? "parameters" : "registers";

  return (
    <Tabs defaultValue={defaultTab} className="flex flex-col h-full">
      <div className="border-b px-3 py-2">
        <TabsList>
          <TabsTrigger value="parameters" className="text-xs md:hidden">Parameters</TabsTrigger>
          <TabsTrigger value="registers" className="text-xs">Registers</TabsTrigger>
          <TabsTrigger value="ccode" className="text-xs">C Code</TabsTrigger>
          <TabsTrigger value="flipper" className="text-xs">Flipper Zero</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="parameters" className="flex-1 overflow-y-auto mt-0 md:hidden">
        <ParameterPanel />
      </TabsContent>
      <TabsContent value="registers" className="flex-1 overflow-hidden mt-0">
        <RegisterTable />
      </TabsContent>
      <TabsContent value="ccode" className="flex-1 overflow-hidden mt-0">
        <CCodeView />
      </TabsContent>
      <TabsContent value="flipper" className="flex-1 overflow-hidden mt-0">
        <FlipperView />
      </TabsContent>
    </Tabs>
  );
}
