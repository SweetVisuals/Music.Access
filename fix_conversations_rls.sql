-- Enable RLS on conversations table
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;

-- 1. Policies for conversations

-- Allow authenticated users to insert new conversations
CREATE POLICY "Authenticated users can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view conversations they are part of
CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
);

-- Allow users to update conversations they are part of
CREATE POLICY "Users can update their conversations"
ON conversations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
);

-- Enable RLS on conversation_participants table
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON conversation_participants;

-- 2. Policies for conversation_participants

-- Allow users to view participants (themselves and others in the same conversation)
CREATE POLICY "Users can view conversation participants"
ON conversation_participants FOR SELECT
USING (
    user_id = auth.uid() 
    OR 
    conversation_id IN (
        SELECT conversation_id FROM conversation_participants
        WHERE user_id = auth.uid()
    )
);

-- Allow authenticated users to add participants (needed for creating new chats)
CREATE POLICY "Authenticated users can add participants"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (true);

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

-- 3. Policies for messages

-- Allow users to view messages for conversations they are in
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
);

-- Allow users to insert messages to conversations they are in
CREATE POLICY "Users can send messages to their conversations"
ON messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
    AND
    EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
);
