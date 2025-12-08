import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const generators = sqliteTable('generators', {
  generatorId: integer('generatorId').primaryKey({ autoIncrement: true }),
  model: text('model').notNull(),
  runningTime: real('runningTime').notNull().$default(()=>0),
  purchasedDate: text('purchasedDate').notNull().$default(()=>Date.now().toLocaleString()),
  lastOilChangeDate: text('lastOilChangeDate').notNull().$default(()=>Date.now().toLocaleString())
});

export const generatorOilChangeLog = sqliteTable('generatorOilChangeLog',{
  generatorLogId: integer('generatorLogId').primaryKey({autoIncrement: true}),
  generatorId: integer('generatorId').references(()=>generators.generatorId),
  OilChangeDate: text('OilChangeDate').notNull().$default(()=>Date.now().toLocaleString()),
  runningTimeAtOilChange: real('runningTimeAtOilChange').notNull().$default(()=>0)
});