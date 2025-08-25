import MonthlySummary from "./MonthlySummary";
import UpcomingBills from "./UpcomingBills";
import ProgressSection from "./ProgressSection";

const Dashboard = ({ data }) => {
  const { monthlySummary, upcomingBills, debtSummary, savingsSummary } = data;

  return (
    <main className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/2 space-y-6">
        <MonthlySummary summary={monthlySummary} />
        <UpcomingBills bills={upcomingBills} />
      </div>
      <div className="lg:w-1/2 space-y-6">
        <ProgressSection
          debtSummary={debtSummary}
          savingsSummary={savingsSummary}
        />
      </div>
    </main>
  );
};

export default Dashboard;
