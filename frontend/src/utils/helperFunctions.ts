export const ConvertTimeToSeconds = (time: string) => {
  const selectedDate = new Date(time);
  const timestampInSeconds = Math.floor(selectedDate.getTime() / 1000);
  return timestampInSeconds;
};

export const DAY_TIME_IN_SECONDS = 86400;