export function formatCountdown(targetDate) {
  if (!targetDate) return "";

  const target = new Date(targetDate);
  const diffMs = target.getTime() - Date.now();

  if (diffMs <= 0) return "Ended";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}
