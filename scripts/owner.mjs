import { config } from '../src/config.mjs';
import { openDatabase } from '../src/db.mjs';
import { Store } from '../src/store.mjs';
const id=process.argv[2];if(!/^\d{1,16}$/.test(id||''))throw new Error('Usage: pnpm owner <verified numeric Telegram ID>');
const db=await openDatabase(config());await db.transaction(async tx=>{const owners=await tx.query("SELECT user_id FROM admins WHERE role='owner'");if(owners.length&&owners[0].user_id!==id)throw new Error('Owner already exists. Transfer ownership from the authenticated admin UI.');await tx.query("INSERT INTO admins(user_id,role) VALUES($1,'owner') ON CONFLICT(user_id) DO UPDATE SET role='owner'",[id]);await new Store(db).audit(tx,'local-operator','bootstrap_owner:'+id);});await db.close();console.log('Owner assigned to the provided Telegram ID.');
