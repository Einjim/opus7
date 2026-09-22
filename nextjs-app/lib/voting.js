// Ported from app.py's generic handle_vote() helper, used by both
// /quiz/update_vote (question_votes/question_id) and
// /quiz/update_reply_vote (reply_votes/comment_id). Table/column names are
// always one of those two hardcoded pairs from the calling routes below,
// never user input, so interpolating them into the SQL text carries the
// same (non-)risk as the original's f-string version.

import { withConnection } from './db';

export async function handleVote(tableName, entityIdCol, entityId, userId, voteType) {
  return withConnection(async (client) => {
    const existing = await client.query(
      `SELECT vote_type FROM ${tableName} WHERE ${entityIdCol} = $1 AND user_id = $2`,
      [entityId, userId]
    );
    const existingVote = existing.rows[0];

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        await client.query(`DELETE FROM ${tableName} WHERE ${entityIdCol} = $1 AND user_id = $2`, [
          entityId,
          userId,
        ]);
      } else {
        await client.query(
          `UPDATE ${tableName} SET vote_type = $1 WHERE ${entityIdCol} = $2 AND user_id = $3`,
          [voteType, entityId, userId]
        );
      }
    } else {
      await client.query(
        `INSERT INTO ${tableName} (${entityIdCol}, user_id, vote_type) VALUES ($1, $2, $3)`,
        [entityId, userId, voteType]
      );
    }

    // COUNT(*) comes back from `pg` as a string (Postgres BIGINT), unlike
    // psycopg2 which hands back a native int -- parseInt() here keeps the
    // JSON response shape (a number) identical to the original.
    const likesResult = await client.query(
      `SELECT COUNT(*) FROM ${tableName} WHERE ${entityIdCol} = $1 AND vote_type = 'like'`,
      [entityId]
    );
    const dislikesResult = await client.query(
      `SELECT COUNT(*) FROM ${tableName} WHERE ${entityIdCol} = $1 AND vote_type = 'dislike'`,
      [entityId]
    );

    return {
      success: true,
      likes: parseInt(likesResult.rows[0].count, 10),
      dislikes: parseInt(dislikesResult.rows[0].count, 10),
    };
  });
}
