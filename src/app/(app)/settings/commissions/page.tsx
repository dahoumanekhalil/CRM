import { listCommissionRules, listCoursesForRulePicker } from "./actions";
import { CommissionRulesClient } from "./rules-client";

export const metadata = { title: "Commission Rules" };

export default async function CommissionRulesPage() {
  const [rules, courses] = await Promise.all([
    listCommissionRules(),
    listCoursesForRulePicker(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Commission Rules</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure fixed commission amounts for sales agents per sale.
        </p>
      </div>
      <CommissionRulesClient rules={rules} courses={courses} />
    </div>
  );
}
