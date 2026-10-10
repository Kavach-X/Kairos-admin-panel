import { redirect } from "next/navigation";

export default function LegacyModelsRedirect() {
  redirect("/dashboard/device-models");
}
