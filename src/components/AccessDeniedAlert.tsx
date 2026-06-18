import { Alert, Text, Anchor } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';

export function AccessDeniedAlert() {
  return (
    <Alert icon={<IconLock size={16} />} color="orange" title="Feature not enabled" variant="light">
      <Text size="sm">
        Your PagerDuty account does not have this enrichment feature enabled.
        Contact your{' '}
        <Anchor href="https://www.pagerduty.com/contact-sales/" target="_blank" size="sm">
          PagerDuty account team
        </Anchor>
        {' '}to request access.
      </Text>
    </Alert>
  );
}
