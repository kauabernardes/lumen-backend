-- CreateTable
CREATE TABLE "Earn" (
    "id" UUID NOT NULL,
    "rewardId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Earn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "value" BIGINT NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Earn_rewardId_idx" ON "Earn"("rewardId");

-- CreateIndex
CREATE INDEX "Earn_userId_idx" ON "Earn"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Earn_rewardId_userId_key" ON "Earn"("rewardId", "userId");

-- AddForeignKey
ALTER TABLE "Earn" ADD CONSTRAINT "Earn_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earn" ADD CONSTRAINT "Earn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
