import { IonGrid, IonRow } from '@ionic/react';
import { V1beta1CronJob, V1Job } from '@kubernetes/client-node';
import React, { useContext } from 'react';
import { RouteComponentProps } from 'react-router';

import { IContext } from '../../../../declarations';
import { AppContext } from '../../../../utils/context';
import { timeDifference } from '../../../../utils/helpers';
import QueryList from '../../../plugins/elasticsearch/QueryList';
import TraceList from '../../../plugins/jaeger/TraceList';
import DashboardList from '../../../plugins/prometheus/DashboardList';
import List from '../../misc/list/List';
import Configuration from '../../misc/template/Configuration';
import Metadata from '../../misc/template/Metadata';
import Row from '../../misc/template/Row';

interface ICronJobDetailsProps extends RouteComponentProps {
  item: V1beta1CronJob;
  section: string;
  type: string;
}

const CronJobDetails: React.FunctionComponent<ICronJobDetailsProps> = ({ item, type }: ICronJobDetailsProps) => {
  const context = useContext<IContext>(AppContext);

  return (
    <IonGrid>
      <IonRow>
        <Configuration>
          <Row obj={item} objKey="spec.schedule" title="Schedule" />
          <Row obj={item} objKey="spec.suspend" title="Suspend" value={(value) => (value ? 'true' : 'false')} />
          <Row obj={item} objKey="spec.concurrencyPolicy" title="Concurrency Policy" />
          <Row
            obj={item}
            objKey="status.lastScheduleTime"
            title="Last Schedule"
            value={(value) => timeDifference(new Date().getTime(), new Date(value.toString()).getTime())}
          />
          <Row obj={item} objKey="spec.successfulJobsHistoryLimit" title="Successful Job History Limit" />
          <Row obj={item} objKey="spec.failedJobsHistoryLimit" title="Failed Job History Limit" />
        </Configuration>
      </IonRow>

      {item.metadata ? <Metadata metadata={item.metadata} type={type} /> : null}

      {item.metadata && item.metadata.name && item.metadata.namespace ? (
        <IonRow>
          <List
            name="Jobs"
            section="workloads"
            type="jobs"
            namespace={item.metadata.namespace}
            parent={item}
            filter={(job: V1Job) =>
              job.metadata && job.metadata.ownerReferences && job.metadata.ownerReferences.length === 1
                ? job.metadata.ownerReferences[0].name ===
                  (item.metadata && item.metadata.name ? item.metadata.name : '')
                : false
            }
          />
        </IonRow>
      ) : null}

      {item.metadata && item.metadata.name && item.metadata.namespace ? (
        <IonRow>
          <List
            name="Events"
            section="cluster"
            type="events"
            namespace={item.metadata.namespace}
            parent={item}
            selector={`fieldSelector=involvedObject.name=${item.metadata.name}`}
          />
        </IonRow>
      ) : null}

      {context.settings.prometheusEnabled ? <DashboardList item={item} /> : null}
      {context.settings.elasticsearchEnabled ? <QueryList item={item} /> : null}
      {context.settings.jaegerEnabled ? <TraceList item={item} /> : null}
    </IonGrid>
  );
};

export default CronJobDetails;
