-- Helper function to check participation without recursion (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION is_conversation_participant(_conversation_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM conversation_participants cp
    WHERE cp.conversation_id = _conversation_id
    AND cp.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Policies for conversations table
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;

CREATE POLICY "Authenticated users can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
USING (
    is_conversation_participant(id)
);

CREATE POLICY "Users can update their conversations"
ON conversations FOR UPDATE
USING (
    is_conversation_participant(id)
);

-- 2. Policies for conversation_participants table
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON conversation_participants;

-- This policy allows a user to see rows in conversation_participants IF:
-- 1. The row is about them (user_id = auth.uid())
-- 2. OR they are a participant in that conversation (checked via function to avoid recursion)
CREATE POLICY "Users can view conversation participants"
ON conversation_participants FOR SELECT
USING (
    user_id = auth.uid()
    OR
    is_conversation_participant(conversation_id)
);

CREATE POLICY "Authenticated users can add participants"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Policies for messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
    is_conversation_participant(conversation_id)
);

CREATE POLICY "Users can send messages to their conversations"
ON messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
    AND
    is_conversation_participant(conversation_id)
);
