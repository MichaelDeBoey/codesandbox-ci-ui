import React from "react";
import styled, { ThemeProvider, createGlobalStyle } from "styled-components";
import JavascriptTimeAgo from "javascript-time-ago";
// The desired locales.
import en from "javascript-time-ago/locale/en";

import { Header, HEADER_HEIGHT } from "./Header";
import { StatusListItem } from "./StatusListItem";
import { StatusList } from "./StatusList";
import { Details } from "./Details";
import { colors } from "../theme/colors";
import { IPR, IBuild, getPrs, getBuilds } from "../utils/api";
import { Layout } from "./Layout";

// Initialize the desired locales.
JavascriptTimeAgo.locale(en);

const Content = styled.div`
  display: flex;
  height: calc(100% - ${HEADER_HEIGHT});
`;

const NotFoundError = styled.div`
  font-size: 2rem;
  display: flex;
  height: calc(100% - ${HEADER_HEIGHT});
  width: 100%;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1.6;
`;

export interface StatusPageProps {
  username: string;
  repo: string;
  prs: IPR[];
  selectedPrNumber: number;
  selectedBuildId: number;
  builds?: IBuild[];
  notFound?: boolean;
}

const StatusPage = ({
  username,
  repo,
  prs,
  selectedPrNumber = prs && prs[0].number,
  selectedBuildId,
  builds,
  notFound
}: StatusPageProps) => {
  if (notFound) {
    return (
      <Layout title="Not Found">
        <NotFoundError>
          <div style={{ maxWidth: 900 }}>
            We could not find the repository you were looking for, have you
            installed the GitHub App?
          </div>
        </NotFoundError>
      </Layout>
    );
  }

  const latestBuild = prs.find(pr => pr.number === selectedPrNumber)
    .latestBuild;

  const buildsToShow = builds || [latestBuild];
  const selectedBuild = builds.find(build => build.id === selectedBuildId);

  return (
    <Layout title={`${username}/${repo}`}>
      <Content>
        <StatusList title="Pull Requests">
          {prs.map(pr => (
            <StatusListItem
              key={pr.id}
              title={`#${pr.number}`}
              description={pr.title}
              timestamp={+new Date(pr.createdAt)}
              status={pr.latestBuild.status}
              selected={pr.number === selectedPrNumber}
              link={{
                href: `/status/[username]/[repo]/pr/[prNumber]`,
                as: `/status/${username}/${repo}/pr/${pr.number}`
              }}
            />
          ))}
        </StatusList>

        <StatusList title="Build Activity">
          {buildsToShow.map(build => (
            <StatusListItem
              key={build.id}
              title={`#${build.id}`}
              description={build.commitTitle}
              timestamp={+new Date(build.createdAt)}
              status={build.status}
              selected={build.id === selectedBuildId}
              link={{
                as: `/status/${username}/${repo}/pr/${selectedPrNumber}/builds/${
                  build.id
                }`,
                href: `/status/[username]/[repo]/pr/[prNumber]/builds/[buildId]`
              }}
            />
          ))}
        </StatusList>

        <Details
          build={selectedBuild}
          repo={repo}
          username={username}
          prNumber={selectedPrNumber}
        />
      </Content>
    </Layout>
  );
};

StatusPage.getInitialProps = async ({
  query,
  res
}): Promise<StatusPageProps | { notFound: true }> => {
  try {
    const { username, repo } = query;

    if (!username) {
      throw new Error("Please define a username");
    }

    if (!repo) {
      throw new Error("Please define a repo");
    }

    const { prs } = await getPrs(username, repo);
    let prNumber = query.prNumber;
    if (!prNumber) {
      prNumber = prs[0].number;
    }

    prNumber = +prNumber;

    const selectedPR = prs.find(pr => pr.number === prNumber);
    let buildId = query.buildId;
    if (!buildId) {
      buildId = selectedPR.latestBuildId;
    }
    buildId = +buildId;

    const { builds } = await getBuilds(username, repo, prNumber);

    return {
      username,
      repo,
      prs,
      builds,
      selectedPrNumber: prNumber,
      selectedBuildId: buildId
    };
  } catch (e) {
    if (res) {
      res.status = e.response.status;
    }

    return { notFound: true };
  }
};

export { StatusPage };
