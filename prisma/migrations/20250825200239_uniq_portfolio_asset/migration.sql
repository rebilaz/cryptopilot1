/*
  Warnings:

  - A unique constraint covering the columns `[portfolioId,asset]` on the table `Position` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Position_portfolioId_asset_key" ON "Position"("portfolioId", "asset");
