import { Box, HStack, SimpleGrid, Skeleton, VStack } from '@chakra-ui/react'

const skeletonProps = {
  startColor: 'var(--bg-secondary)',
  endColor: 'var(--border-hover)',
}

const CardShell = ({ children }: { children: React.ReactNode }) => (
  <Box
    p="1.5em"
    bg="var(--bg-dark)"
    border="1px solid var(--border-hover)"
    borderRadius="var(--radius-lg)"
    w="100%"
  >
    {children}
  </Box>
)

const CardHeader = ({ width }: { width: string }) => (
  <HStack spacing=".75em" mb="1.5em">
    <Skeleton
      height="24px"
      width="24px"
      borderRadius="4px"
      {...skeletonProps}
    />
    <Skeleton
      height="20px"
      width={width}
      borderRadius="6px"
      {...skeletonProps}
    />
  </HStack>
)

const SkeletonRow = ({
  labelW = '90px',
  valueW = '120px',
}: {
  labelW?: string
  valueW?: string
}) => (
  <HStack justify="space-between">
    <Skeleton
      height="20px"
      width={labelW}
      borderRadius="6px"
      {...skeletonProps}
    />
    <Skeleton
      height="20px"
      width={valueW}
      borderRadius="6px"
      {...skeletonProps}
    />
  </HStack>
)

export const RenewalSkeleton = () => {
  return (
    <VStack spacing="2em" align="stretch" w="90%" maxW="640px">
      <HStack spacing="0.5em">
        <Skeleton
          height="16px"
          width="16px"
          borderRadius="3px"
          {...skeletonProps}
        />
        <Skeleton
          height="20px"
          width="110px"
          borderRadius="6px"
          {...skeletonProps}
        />
      </HStack>

      <CardShell>
        <CardHeader width="100px" />
        <VStack spacing="1em" align="stretch">
          <SkeletonRow labelW="70px" valueW="140px" />
          <SkeletonRow labelW="40px" valueW="60px" />
          <SkeletonRow labelW="130px" valueW="90px" />
          <SkeletonRow labelW="50px" valueW="110px" />
        </VStack>
      </CardShell>

      <CardShell>
        <CardHeader width="140px" />
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing="1em" mb="1.5em">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              height="48px"
              borderRadius="var(--radius-md)"
              {...skeletonProps}
            />
          ))}
        </SimpleGrid>
        <HStack spacing=".75em">
          <Skeleton
            height="20px"
            width="50px"
            borderRadius="6px"
            {...skeletonProps}
          />
          <Skeleton
            height="44px"
            flex="1"
            borderRadius="var(--radius-md)"
            {...skeletonProps}
          />
          <Skeleton
            height="20px"
            width="30px"
            borderRadius="6px"
            {...skeletonProps}
          />
        </HStack>
      </CardShell>

      <CardShell>
        <CardHeader width="110px" />
        <VStack spacing="1em" align="stretch">
          <SkeletonRow labelW="60px" valueW="60px" />
          <HStack justify="space-between" align="baseline">
            <Skeleton
              height="20px"
              width="40px"
              borderRadius="6px"
              {...skeletonProps}
            />
            <VStack spacing="0.25em" align="flex-end">
              <Skeleton
                height="32px"
                width="140px"
                borderRadius="6px"
                {...skeletonProps}
              />
              <Skeleton
                height="16px"
                width="80px"
                borderRadius="6px"
                {...skeletonProps}
              />
            </VStack>
          </HStack>
          <SkeletonRow labelW="100px" valueW="80px" />
        </VStack>
      </CardShell>

      <Skeleton
        height="48px"
        width="100%"
        borderRadius="var(--radius-lg)"
        {...skeletonProps}
      />
    </VStack>
  )
}
