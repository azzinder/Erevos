// The phone's own module (modules/erevos-device) for checks under Node: it keeps the reminders of
// Chat with myself asked of it, by their ids, until they are forgotten.
export const reminders = new Map<string, number>();

export const device = {
  remind: (id: string, at: number): boolean => {
    reminders.set(id, at);
    return true;
  },
  forgetReminder: (id: string): void => {
    reminders.delete(id);
  },
};
