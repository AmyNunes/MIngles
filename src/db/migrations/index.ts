import type { Migration } from '../types';

import { migration001 } from './001_foundation';
import { migration002 } from './002_cards';
import { migration003 } from './003_notifications';
import { migration004 } from './004_reader';
import { migration005 } from './005_production';
import { migration006 } from './006_progress';
import { migration007 } from './007_rehearsals';
import { migration008 } from './008_extras';

/** Todas as migrations, em ordem. Para mudar o banco, acrescente uma nova no fim. */
export const migrations: readonly Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
];
