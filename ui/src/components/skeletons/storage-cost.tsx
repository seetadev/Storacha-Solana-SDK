import { Skeleton, Stack } from '@chakra-ui/react'

export const StorageCostSkeleton = () => {
  return (
    <Stack gap=".4em" justifyContent="flex-end" alignItems="flex-end">
      <Skeleton
        height="30px"
        width={{ lg: '180px', md: '70%', base: '70%' }}
        startColor="var(--bg-secondary)"
        endColor="var(--border-hover)"
        borderRadius="10px"
      />
      <Skeleton
        height="18px"
        width="90px"
        startColor="var(--bg-secondary)"
        endColor="var(--border-hover)"
        borderRadius="6px"
      />
    </Stack>
  )
}
