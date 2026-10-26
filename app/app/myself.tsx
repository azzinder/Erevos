import { MyselfChat } from '../components/myself-chat';

// Chat with myself, the open space's (components/myself-chat.tsx): its row is always at the top of
// the chats (app/index.tsx), and a reminder's notice opens it.
export default function MyselfScreen() {
  return <MyselfChat />;
}
