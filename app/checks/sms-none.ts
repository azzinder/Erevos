// The SMS module (modules/erevos-sms) for checks under Node: a phone without SMS.
export const takeSmsInvites = async (): Promise<{ from: string; data: string; at: number }[]> => [];
export const smsStatus = () => null;
export const smsThreads = async () => [];
export const smsReady = () => false;
export const sendSms = async (): Promise<number> => {
  throw new Error('This app was built without SMS.');
};
